import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  createUserTransaction,
  getUserTransactions,
  isCategoryAccessibleByUser,
} from '#/features/transactions/server/transactions-repository'
import { isPaymentAccountAccessibleByUser } from '#/features/payment-accounts/server/payment-accounts-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
  resolveTargetUserId,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'

const createTransactionSchema = z.object({
  title: z.string().min(1),
  amount: z.string().min(1),
  currency: z.string().trim().length(3).optional(),
  exchangeRate: z.string().trim().min(1).optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  categoryId: z.number().int().positive(),
  paymentAccountId: z.number().int().positive().nullable().optional(),
  source: z.string().optional(),
  note: z.string().optional(),
  happenedAt: z.string().datetime().optional(),
})

export const Route = createFileRoute('/api/transactions')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const requestedUserId = new URL(request.url).searchParams.get('userId')
        const targetUserId = resolveTargetUserId({
          requester: userContext,
          requestedUserId,
        })

        const rows = await getUserTransactions(targetUserId)
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body
        const parsed = createTransactionSchema.safeParse(body)

        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid transaction payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const enteredAmount = parsePositiveNumber(parsed.data.amount)
        if (enteredAmount === null) {
          return Response.json({ success: false, error: 'Amount must be a positive number' }, { status: 400 })
        }

        const enteredCurrency = (parsed.data.currency ?? userContext.currency).toUpperCase()
        const isForeignCurrency = enteredCurrency !== userContext.currency
        const parsedExchangeRate = isForeignCurrency
          ? parsePositiveNumber(parsed.data.exchangeRate ?? '')
          : 1

        if (parsedExchangeRate === null) {
          return Response.json(
            { success: false, error: 'Exchange rate is required for foreign currency entries' },
            { status: 400 },
          )
        }

        const normalizedAmount = enteredAmount * parsedExchangeRate

        const canUseCategory = await isCategoryAccessibleByUser({
          userId: userContext.id,
          categoryId: parsed.data.categoryId,
        })

        if (!canUseCategory) {
          return Response.json({ success: false, error: 'Category not found' }, { status: 404 })
        }

        let paymentAccountId: number | null = parsed.data.paymentAccountId ?? null
        if (paymentAccountId) {
          const canUseAccount = await isPaymentAccountAccessibleByUser({
            userId: userContext.id,
            paymentAccountId,
          })
          if (!canUseAccount) {
            return Response.json({ success: false, error: 'Payment account not found' }, { status: 404 })
          }
        }

        const row = await createUserTransaction({
          userId: userContext.id,
          title: parsed.data.title,
          amount: normalizedAmount.toString(),
          sourceAmount: isForeignCurrency ? enteredAmount.toString() : null,
          sourceCurrency: enteredCurrency,
          exchangeRate: parsedExchangeRate.toString(),
          type: parsed.data.type,
          categoryId: parsed.data.categoryId,
          paymentAccountId,
          source: parsed.data.source ?? null,
          note: parsed.data.note ?? null,
          happenedAt: parsed.data.happenedAt ? new Date(parsed.data.happenedAt) : new Date(),
        })

        return Response.json({ success: true, data: row }, { status: 201 })
      },
      OPTIONS: ({ request }) => {
        return buildOptionsResponse(request)
      },
    },
  },
})

/**
 * Parses a positive numeric string and returns null for invalid values.
 */
function parsePositiveNumber(value: string): number | null {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) return null
  if (parsedValue <= 0) return null
  return parsedValue
}

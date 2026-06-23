import { createFileRoute } from '@tanstack/react-router'
import {
  createUserTransaction,
  getUserTransactions,
  isCategoryAccessibleByUser,
} from '#/features/transactions/server/transactions-repository'
import { createTransactionSchema } from '#/features/transactions/schemas/transaction'
import { isPaymentAccountAccessibleByUser } from '#/features/payment-accounts/server/payment-accounts-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'
import {
  requiresTransactionCategory,
  resolveTransactionCategoryId,
} from '#/features/transactions/utils/transaction-category'
import { normalizeTransactionAmount } from '#/features/transactions/utils/transaction-currency'

export const Route = createFileRoute('/api/transactions')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const rows = await getUserTransactions(userContext.id)
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

        const userIdRejected = rejectClientSuppliedUserId(request, body as Record<string, unknown>)
        if (userIdRejected) return userIdRejected

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

        const amountResult = normalizeTransactionAmount({
          amount: parsed.data.amount,
          currency: parsed.data.currency ?? userContext.currency,
          userCurrency: userContext.currency,
          exchangeRate: parsed.data.exchangeRate,
        })

        if (!amountResult.ok) {
          return Response.json({ success: false, error: amountResult.error }, { status: 400 })
        }

        const categoryId = resolveTransactionCategoryId(parsed.data.type, parsed.data.categoryId)

        if (requiresTransactionCategory(parsed.data.type) && categoryId === null) {
          return Response.json({ success: false, error: 'Category is required for expense and transfer' }, { status: 400 })
        }

        if (categoryId !== null) {
          const canUseCategory = await isCategoryAccessibleByUser({
            userId: userContext.id,
            categoryId,
          })

          if (!canUseCategory) {
            return Response.json({ success: false, error: 'Category not found' }, { status: 404 })
          }
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
          amount: amountResult.data.normalizedAmount,
          sourceAmount: amountResult.data.sourceAmount,
          sourceCurrency: amountResult.data.sourceCurrency,
          exchangeRate: amountResult.data.exchangeRate,
          type: parsed.data.type,
          categoryId,
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

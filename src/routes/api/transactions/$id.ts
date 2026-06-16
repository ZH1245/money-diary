import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  deleteUserTransaction,
  getUserTransactionById,
  isCategoryAccessibleByUser,
  updateUserTransaction,
} from '#/features/transactions/server/transactions-repository'
import { isPaymentAccountAccessibleByUser } from '#/features/payment-accounts/server/payment-accounts-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'
import { parseJsonBody } from '#/lib/server/request-body'
import {
  apiAmountSchema,
  apiNoteSchema,
  apiSourceSchema,
  apiTitleSchema,
  parsePositiveAmount,
} from '#/lib/server/validation-schemas'

const updateTransactionSchema = z.object({
  title: apiTitleSchema.optional(),
  amount: apiAmountSchema.optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  categoryId: z.number().int().positive().optional(),
  paymentAccountId: z.number().int().positive().nullable().optional(),
  source: apiSourceSchema.nullable(),
  note: apiNoteSchema.nullable(),
  happenedAt: z.string().datetime().optional(),
})

export const Route = createFileRoute('/api/transactions/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const transactionId = parseRouteId(params.id)
        if (!transactionId) {
          return Response.json({ success: false, error: 'Invalid transaction id' }, { status: 400 })
        }

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body
        const parsed = updateTransactionSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid transaction payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const existing = await getUserTransactionById(userContext.id, transactionId)
        if (!existing) {
          return Response.json({ success: false, error: 'Transaction not found' }, { status: 404 })
        }

        if (parsed.data.categoryId !== undefined) {
          const canUseCategory = await isCategoryAccessibleByUser({
            userId: userContext.id,
            categoryId: parsed.data.categoryId,
          })
          if (!canUseCategory) {
            return Response.json({ success: false, error: 'Category not found' }, { status: 404 })
          }
        }

        if (parsed.data.paymentAccountId) {
          const canUseAccount = await isPaymentAccountAccessibleByUser({
            userId: userContext.id,
            paymentAccountId: parsed.data.paymentAccountId,
          })
          if (!canUseAccount) {
            return Response.json({ success: false, error: 'Payment account not found' }, { status: 404 })
          }
        }

        let amount = parsed.data.amount
        if (amount !== undefined) {
          const parsedAmount = parsePositiveAmount(amount)
          if (parsedAmount === null) {
            return Response.json({ success: false, error: 'Amount must be a positive number' }, { status: 400 })
          }
          amount = parsedAmount.toString()
        }

        const row = await updateUserTransaction({
          userId: userContext.id,
          transactionId,
          title: parsed.data.title?.trim(),
          amount,
          type: parsed.data.type,
          categoryId: parsed.data.categoryId,
          ...(parsed.data.paymentAccountId !== undefined ? { paymentAccountId: parsed.data.paymentAccountId } : {}),
          source: parsed.data.source,
          note: parsed.data.note,
          happenedAt: parsed.data.happenedAt ? new Date(parsed.data.happenedAt) : undefined,
        })

        return Response.json({ success: true, data: row })
      },
      DELETE: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const transactionId = parseRouteId(params.id)
        if (!transactionId) {
          return Response.json({ success: false, error: 'Invalid transaction id' }, { status: 400 })
        }

        const deleted = await deleteUserTransaction(userContext.id, transactionId)
        if (!deleted) {
          return Response.json({ success: false, error: 'Transaction not found' }, { status: 404 })
        }

        return Response.json({ success: true, data: deleted })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

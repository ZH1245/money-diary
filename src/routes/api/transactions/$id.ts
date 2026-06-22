import { createFileRoute } from '@tanstack/react-router'
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
  requiresTransactionCategory,
  resolveTransactionCategoryId,
} from '#/features/transactions/utils/transaction-category'
import { normalizeTransactionAmount } from '#/features/transactions/utils/transaction-currency'
import { updateTransactionSchema } from '#/features/transactions/schemas/transaction'

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

        const nextType = (parsed.data.type ?? existing.type) as 'income' | 'expense' | 'transfer'
        const nextCategoryId = resolveTransactionCategoryId(
          nextType,
          parsed.data.categoryId !== undefined ? parsed.data.categoryId : existing.categoryId,
        )

        if (requiresTransactionCategory(nextType) && nextCategoryId === null) {
          return Response.json(
            { success: false, error: 'Category is required for expense and transfer' },
            { status: 400 },
          )
        }

        if (nextCategoryId !== null) {
          const canUseCategory = await isCategoryAccessibleByUser({
            userId: userContext.id,
            categoryId: nextCategoryId,
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

        const shouldNormalizeAmount =
          parsed.data.amount !== undefined ||
          parsed.data.currency !== undefined ||
          parsed.data.exchangeRate !== undefined

        let amount: string | undefined
        let sourceAmount: string | null | undefined
        let sourceCurrency: string | undefined
        let exchangeRate: string | undefined

        if (shouldNormalizeAmount) {
          const enteredAmount = parsed.data.amount ?? existing.sourceAmount ?? existing.amount
          const enteredCurrency = (parsed.data.currency ?? existing.sourceCurrency).toUpperCase()
          const enteredExchangeRate = parsed.data.exchangeRate ?? existing.exchangeRate

          const amountResult = normalizeTransactionAmount({
            amount: enteredAmount,
            currency: enteredCurrency,
            userCurrency: userContext.currency,
            exchangeRate: enteredExchangeRate,
          })

          if (!amountResult.ok) {
            return Response.json({ success: false, error: amountResult.error }, { status: 400 })
          }

          amount = amountResult.data.normalizedAmount
          sourceAmount = amountResult.data.sourceAmount
          sourceCurrency = amountResult.data.sourceCurrency
          exchangeRate = amountResult.data.exchangeRate
        }

        const shouldUpdateCategory =
          parsed.data.type !== undefined || parsed.data.categoryId !== undefined

        const row = await updateUserTransaction({
          userId: userContext.id,
          transactionId,
          title: parsed.data.title?.trim(),
          amount,
          sourceAmount,
          sourceCurrency,
          exchangeRate,
          type: parsed.data.type,
          ...(shouldUpdateCategory ? { categoryId: nextCategoryId } : {}),
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

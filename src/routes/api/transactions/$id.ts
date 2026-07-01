import { createFileRoute } from '@tanstack/react-router'
import {
  convertTransactionToTransfer,
  deleteTransfer,
  deleteUserTransaction,
  getUserTransactionById,
  isCategoryAccessibleByUser,
  resolveOptionalTransferCategoryId,
  updateTransfer,
  updateUserTransaction,
} from '#/features/transactions/server/transactions-repository'
import { isPaymentAccountAccessibleByUser } from '#/features/payment-accounts/server/payment-accounts-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'
import { parseJsonBody } from '#/lib/server/request-body'
import {
  requiresTransactionCategory,
  resolveTransactionCategoryId,
} from '#/features/transactions/utils/transaction-category'
import { normalizeTransactionAmount } from '#/features/transactions/utils/transaction-currency'
import {
  updateTransactionSchema,
  updateTransferSchema,
} from '#/features/transactions/schemas/transaction'

export const Route = createFileRoute('/api/transactions/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const transactionId = parseRouteId(params.id)
        if (!transactionId) {
          return Response.json({ success: false, error: 'Invalid transaction id' }, { status: 400 })
        }

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

        const bodyUserIdRejected = rejectClientSuppliedUserId(request, body as Record<string, unknown>)
        if (bodyUserIdRejected) return bodyUserIdRejected

        const existing = await getUserTransactionById(userContext.id, transactionId)
        if (!existing) {
          return Response.json({ success: false, error: 'Transaction not found' }, { status: 404 })
        }

        if (isTransferBody(body)) {
          if (existing.transferGroupId) {
            return updateTransferHandler(
              userContext,
              existing.transferGroupId,
              existing.categoryId,
              body,
            )
          }

          return convertToTransferHandler(userContext, transactionId, existing, body)
        }

        const parsed = updateTransactionSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid transaction payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const nextType = (parsed.data.type ?? existing.type) as 'income' | 'expense' | 'transfer'
        const nextCategoryId = resolveTransactionCategoryId(
          nextType,
          parsed.data.categoryId !== undefined ? parsed.data.categoryId : existing.categoryId,
        )

        if (requiresTransactionCategory(nextType) && nextCategoryId === null) {
          return Response.json(
            { success: false, error: 'Category is required for expense entries' },
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
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const transactionId = parseRouteId(params.id)
        if (!transactionId) {
          return Response.json({ success: false, error: 'Invalid transaction id' }, { status: 400 })
        }

        const existing = await getUserTransactionById(userContext.id, transactionId)
        if (!existing) {
          return Response.json({ success: false, error: 'Transaction not found' }, { status: 404 })
        }

        if (existing.transferGroupId) {
          const deletedLegs = await deleteTransfer(userContext.id, existing.transferGroupId)
          return Response.json({ success: true, data: deletedLegs[0] ?? { id: transactionId } })
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

/**
 * Identifies a transfer payload by its from/to account fields.
 */
function isTransferBody(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    'fromPaymentAccountId' in body &&
    'toPaymentAccountId' in body
  )
}

/**
 * Validates and applies an update to both legs of an existing transfer.
 */
async function updateTransferHandler(
  userContext: { id: string; currency: string },
  transferGroupId: string,
  existingCategoryId: number | null,
  body: unknown,
): Promise<Response> {
  const parsed = updateTransferSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'Invalid transfer payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const amountResult = normalizeTransactionAmount({
    amount: parsed.data.amount ?? '0',
    currency: parsed.data.currency ?? userContext.currency,
    userCurrency: userContext.currency,
    exchangeRate: parsed.data.exchangeRate,
  })

  if (!amountResult.ok) {
    return Response.json({ success: false, error: amountResult.error }, { status: 400 })
  }

  for (const accountId of [parsed.data.fromPaymentAccountId, parsed.data.toPaymentAccountId]) {
    const canUseAccount = await isPaymentAccountAccessibleByUser({
      userId: userContext.id,
      paymentAccountId: accountId,
    })
    if (!canUseAccount) {
      return Response.json({ success: false, error: 'Payment account not found' }, { status: 404 })
    }
  }

  const categoryInput =
    parsed.data.categoryId !== undefined ? parsed.data.categoryId : existingCategoryId
  const categoryId = await resolveOptionalTransferCategoryId(userContext.id, categoryInput)
  if (categoryId === 'not_found') {
    return Response.json({ success: false, error: 'Category not found' }, { status: 404 })
  }

  const rows = await updateTransfer({
    userId: userContext.id,
    transferGroupId,
    title: parsed.data.title?.trim() ?? '',
    amount: amountResult.data.normalizedAmount,
    sourceAmount: amountResult.data.sourceAmount,
    sourceCurrency: amountResult.data.sourceCurrency,
    exchangeRate: amountResult.data.exchangeRate,
    fromPaymentAccountId: parsed.data.fromPaymentAccountId,
    toPaymentAccountId: parsed.data.toPaymentAccountId,
    categoryId,
    note: parsed.data.note ?? null,
    happenedAt: parsed.data.happenedAt ? new Date(parsed.data.happenedAt) : new Date(),
  })

  return Response.json({ success: true, data: rows[0] })
}

/**
 * Replaces a single income/expense row with a two-leg transfer.
 */
async function convertToTransferHandler(
  userContext: { id: string; currency: string },
  transactionId: number,
  existing: NonNullable<Awaited<ReturnType<typeof getUserTransactionById>>>,
  body: unknown,
): Promise<Response> {
  const parsed = updateTransferSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'Invalid transfer payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const amountResult = normalizeTransactionAmount({
    amount: parsed.data.amount ?? existing.amount,
    currency: parsed.data.currency ?? existing.sourceCurrency ?? userContext.currency,
    userCurrency: userContext.currency,
    exchangeRate: parsed.data.exchangeRate ?? existing.exchangeRate,
  })

  if (!amountResult.ok) {
    return Response.json({ success: false, error: amountResult.error }, { status: 400 })
  }

  for (const accountId of [parsed.data.fromPaymentAccountId, parsed.data.toPaymentAccountId]) {
    const canUseAccount = await isPaymentAccountAccessibleByUser({
      userId: userContext.id,
      paymentAccountId: accountId,
    })
    if (!canUseAccount) {
      return Response.json({ success: false, error: 'Payment account not found' }, { status: 404 })
    }
  }

  const categoryInput =
    parsed.data.categoryId !== undefined ? parsed.data.categoryId : existing.categoryId
  const categoryId = await resolveOptionalTransferCategoryId(userContext.id, categoryInput)
  if (categoryId === 'not_found') {
    return Response.json({ success: false, error: 'Category not found' }, { status: 404 })
  }

  try {
    const rows = await convertTransactionToTransfer({
      userId: userContext.id,
      transactionId,
      title: parsed.data.title?.trim() ?? existing.title,
      amount: amountResult.data.normalizedAmount,
      sourceAmount: amountResult.data.sourceAmount,
      sourceCurrency: amountResult.data.sourceCurrency,
      exchangeRate: amountResult.data.exchangeRate,
      fromPaymentAccountId: parsed.data.fromPaymentAccountId,
      toPaymentAccountId: parsed.data.toPaymentAccountId,
      categoryId,
      note: parsed.data.note ?? existing.note ?? null,
      happenedAt: parsed.data.happenedAt ? new Date(parsed.data.happenedAt) : existing.happenedAt,
    })

    if (!rows) {
      return Response.json({ success: false, error: 'Transaction not found' }, { status: 404 })
    }

    return Response.json({ success: true, data: rows[0] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to convert transaction to transfer'
    return Response.json({ success: false, error: message }, { status: 400 })
  }
}

import { createFileRoute } from '@tanstack/react-router'
import { createUserSaving, getUserSavings } from '#/features/savings/server/savings-repository'
import { createSavingSchema, DEFAULT_SAVING_TITLE, DEFAULT_SAVING_WITHDRAWAL_TITLE } from '#/features/savings/schemas/saving'
import { getUserGoalById } from '#/features/goals/server/goals-repository'
import { isPaymentAccountAccessibleByUser } from '#/features/payment-accounts/server/payment-accounts-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'
import { parseUtcDateTimeInput } from '#/lib/server/datetime'
import { parsePositiveAmount } from '#/lib/server/validation-schemas'

export const Route = createFileRoute('/api/savings')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        try {
          const rows = await getUserSavings(userContext.id)
          return Response.json({ success: true, data: rows })
        } catch (error) {
          console.error('[GET /api/savings]', error)
          return Response.json(
            {
              success: false,
              error:
                error instanceof Error && /entry_type/i.test(error.message)
                  ? 'Savings schema is out of date. Run database migration 0024_savings_entry_type.'
                  : 'Unable to load savings',
            },
            { status: 500 },
          )
        }
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

        const parsed = createSavingSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid saving payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const amount = parsePositiveAmount(parsed.data.amount)
        if (amount === null) {
          return Response.json({ success: false, error: 'Amount must be a positive number' }, { status: 400 })
        }

        let goalId: number | null = parsed.data.goalId ?? null
        if (goalId) {
          const goal = await getUserGoalById(userContext.id, goalId)
          if (!goal) {
            return Response.json({ success: false, error: 'Goal not found' }, { status: 404 })
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

        const entryType = parsed.data.entryType ?? 'deposit'
        const defaultTitle = entryType === 'withdrawal' ? DEFAULT_SAVING_WITHDRAWAL_TITLE : DEFAULT_SAVING_TITLE

        const row = await createUserSaving({
          userId: userContext.id,
          goalId,
          paymentAccountId,
          title: parsed.data.title?.trim() || defaultTitle,
          amount: amount.toString(),
          entryType,
          note: parsed.data.note?.trim() || null,
          savedAt: parsed.data.savedAt
            ? parseUtcDateTimeInput(parsed.data.savedAt)
            : new Date(),
        })

        return Response.json({ success: true, data: row }, { status: 201 })
      },
      OPTIONS: ({ request }) => {
        return buildOptionsResponse(request)
      },
    },
  },
})

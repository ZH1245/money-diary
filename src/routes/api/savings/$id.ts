import { createFileRoute } from '@tanstack/react-router'
import {
  deleteUserSaving,
  updateUserSaving,
} from '#/features/savings/server/savings-repository'
import { getUserGoalById } from '#/features/goals/server/goals-repository'
import { isPaymentAccountAccessibleByUser } from '#/features/payment-accounts/server/payment-accounts-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'
import { parseJsonBody } from '#/lib/server/request-body'
import { updateSavingSchema } from '#/features/savings/schemas/saving'
import { parsePositiveAmount } from '#/lib/server/validation-schemas'

export const Route = createFileRoute('/api/savings/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const savingId = parseRouteId(params.id)
        if (!savingId) {
          return Response.json({ success: false, error: 'Invalid saving id' }, { status: 400 })
        }

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

        const bodyUserIdRejected = rejectClientSuppliedUserId(request, body as Record<string, unknown>)
        if (bodyUserIdRejected) return bodyUserIdRejected
        const parsed = updateSavingSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid saving payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        let amount = parsed.data.amount
        if (amount !== undefined) {
          const parsedAmount = parsePositiveAmount(amount)
          if (parsedAmount === null) {
            return Response.json({ success: false, error: 'Amount must be a positive number' }, { status: 400 })
          }
          amount = parsedAmount.toString()
        }

        if (parsed.data.goalId) {
          const goal = await getUserGoalById(userContext.id, parsed.data.goalId)
          if (!goal) {
            return Response.json({ success: false, error: 'Goal not found' }, { status: 404 })
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

        const row = await updateUserSaving({
          userId: userContext.id,
          savingId,
          title: parsed.data.title?.trim(),
          amount,
          note: parsed.data.note,
          savedAt: parsed.data.savedAt ? new Date(parsed.data.savedAt) : undefined,
          ...(parsed.data.entryType !== undefined ? { entryType: parsed.data.entryType } : {}),
          ...(parsed.data.goalId !== undefined ? { goalId: parsed.data.goalId } : {}),
          ...(parsed.data.paymentAccountId !== undefined ? { paymentAccountId: parsed.data.paymentAccountId } : {}),
        })

        if (!row) {
          return Response.json({ success: false, error: 'Saving not found' }, { status: 404 })
        }

        return Response.json({ success: true, data: row })
      },
      DELETE: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const savingId = parseRouteId(params.id)
        if (!savingId) {
          return Response.json({ success: false, error: 'Invalid saving id' }, { status: 400 })
        }

        const deleted = await deleteUserSaving(userContext.id, savingId)
        if (!deleted) {
          return Response.json({ success: false, error: 'Saving not found' }, { status: 404 })
        }

        return Response.json({ success: true, data: deleted })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { createUserSaving, getUserSavings } from '#/features/savings/server/savings-repository'
import { getUserGoalById } from '#/features/goals/server/goals-repository'
import { isPaymentAccountAccessibleByUser } from '#/features/payment-accounts/server/payment-accounts-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  assertTargetUserId,
  requireUserContext,
  resolveTargetUserId,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'
import { apiAmountSchema, apiNoteSchema, apiOptionalUserIdSchema, apiTitleSchema, parsePositiveAmount } from '#/lib/server/validation-schemas'

const createSavingSchema = z.object({
  title: apiTitleSchema.optional(),
  amount: apiAmountSchema,
  note: apiNoteSchema,
  savedAt: z.string().datetime().optional(),
  goalId: z.number().int().positive().nullable().optional(),
  paymentAccountId: z.number().int().positive().nullable().optional(),
  userId: apiOptionalUserIdSchema,
})

const DEFAULT_SAVING_TITLE = 'Savings deposit'

export const Route = createFileRoute('/api/savings')({
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

        const rows = await getUserSavings(targetUserId)
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body
        const parsed = createSavingSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid saving payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const targetUserId = assertTargetUserId({
          requester: userContext,
          requestedUserId: parsed.data.userId,
        })
        if (targetUserId instanceof Response) return targetUserId

        const amount = parsePositiveAmount(parsed.data.amount)
        if (amount === null) {
          return Response.json({ success: false, error: 'Amount must be a positive number' }, { status: 400 })
        }

        let goalId: number | null = parsed.data.goalId ?? null
        if (goalId) {
          const goal = await getUserGoalById(targetUserId, goalId)
          if (!goal) {
            return Response.json({ success: false, error: 'Goal not found' }, { status: 404 })
          }
        }

        let paymentAccountId: number | null = parsed.data.paymentAccountId ?? null
        if (paymentAccountId) {
          const canUseAccount = await isPaymentAccountAccessibleByUser({
            userId: targetUserId,
            paymentAccountId,
          })
          if (!canUseAccount) {
            return Response.json({ success: false, error: 'Payment account not found' }, { status: 404 })
          }
        }

        const row = await createUserSaving({
          userId: targetUserId,
          goalId,
          paymentAccountId,
          title: parsed.data.title?.trim() || DEFAULT_SAVING_TITLE,
          amount: amount.toString(),
          note: parsed.data.note?.trim() || null,
          savedAt: parsed.data.savedAt ? new Date(parsed.data.savedAt) : new Date(),
        })

        return Response.json({ success: true, data: row }, { status: 201 })
      },
      OPTIONS: ({ request }) => {
        return buildOptionsResponse(request)
      },
    },
  },
})

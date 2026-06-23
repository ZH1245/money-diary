import { createFileRoute } from '@tanstack/react-router'
import { createUserGoal, getUserGoals } from '#/features/goals/server/goals-repository'
import { createGoalSchema } from '#/features/goals/schemas/goal'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'
import {
  parseNonNegativeAmount,
  parsePositiveAmount,
} from '#/lib/server/validation-schemas'

export const Route = createFileRoute('/api/goals')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const rows = await getUserGoals(userContext.id)
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

        const parsed = createGoalSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid goal payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const targetAmount = parsePositiveAmount(parsed.data.targetAmount)
        const currentAmount = parseNonNegativeAmount(parsed.data.currentAmount ?? '0')
        const savingsAmount = parseNonNegativeAmount(parsed.data.savingsAmount ?? '0')
        if (targetAmount === null) {
          return Response.json({ success: false, error: 'Target amount must be a positive number' }, { status: 400 })
        }

        if (currentAmount === null) {
          return Response.json({ success: false, error: 'Current amount must be a valid number' }, { status: 400 })
        }

        if (savingsAmount === null) {
          return Response.json({ success: false, error: 'Savings amount must be a valid number' }, { status: 400 })
        }

        const row = await createUserGoal({
          userId: userContext.id,
          title: parsed.data.title,
          targetAmount: targetAmount.toString(),
          currentAmount: currentAmount.toString(),
          savingsAmount: savingsAmount.toString(),
          status: parsed.data.status ?? 'active',
          targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
          note: parsed.data.note?.trim() || null,
        })

        return Response.json({ success: true, data: row }, { status: 201 })
      },
      OPTIONS: ({ request }) => {
        return buildOptionsResponse(request)
      },
    },
  },
})

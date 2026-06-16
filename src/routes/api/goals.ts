import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { createUserGoal, getUserGoals } from '#/features/goals/server/goals-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  assertTargetUserId,
  requireUserContext,
  resolveTargetUserId,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'
import {
  apiAmountSchema,
  apiNoteSchema,
  apiOptionalUserIdSchema,
  apiTitleSchema,
  parseNonNegativeAmount,
  parsePositiveAmount,
} from '#/lib/server/validation-schemas'

const createGoalSchema = z.object({
  title: apiTitleSchema,
  targetAmount: apiAmountSchema,
  currentAmount: apiAmountSchema.optional(),
  savingsAmount: apiAmountSchema.optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  targetDate: z.string().datetime().optional(),
  note: apiNoteSchema,
  userId: apiOptionalUserIdSchema,
})

export const Route = createFileRoute('/api/goals')({
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

        const rows = await getUserGoals(targetUserId)
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body
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

        const targetUserId = assertTargetUserId({
          requester: userContext,
          requestedUserId: parsed.data.userId,
        })
        if (targetUserId instanceof Response) return targetUserId

        const row = await createUserGoal({
          userId: targetUserId,
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

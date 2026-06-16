import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  deleteUserGoal,
  updateUserGoal,
} from '#/features/goals/server/goals-repository'
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
  apiTitleSchema,
  parseNonNegativeAmount,
  parsePositiveAmount,
} from '#/lib/server/validation-schemas'

const updateGoalSchema = z.object({
  title: apiTitleSchema.optional(),
  targetAmount: apiAmountSchema.optional(),
  currentAmount: apiAmountSchema.optional(),
  savingsAmount: apiAmountSchema.optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  targetDate: z.string().datetime().nullable().optional(),
  note: apiNoteSchema.nullable(),
})

export const Route = createFileRoute('/api/goals/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const goalId = parseRouteId(params.id)
        if (!goalId) {
          return Response.json({ success: false, error: 'Invalid goal id' }, { status: 400 })
        }

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body
        const parsed = updateGoalSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid goal payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        let targetAmount = parsed.data.targetAmount
        if (targetAmount !== undefined) {
          const parsedTarget = parsePositiveAmount(targetAmount)
          if (parsedTarget === null) {
            return Response.json({ success: false, error: 'Target amount must be positive' }, { status: 400 })
          }
          targetAmount = parsedTarget.toString()
        }

        let currentAmount = parsed.data.currentAmount
        if (currentAmount !== undefined) {
          const parsedCurrent = parseNonNegativeAmount(currentAmount)
          if (parsedCurrent === null) {
            return Response.json({ success: false, error: 'Current amount must be valid' }, { status: 400 })
          }
          currentAmount = parsedCurrent.toString()
        }

        let savingsAmount = parsed.data.savingsAmount
        if (savingsAmount !== undefined) {
          const parsedSavings = parseNonNegativeAmount(savingsAmount)
          if (parsedSavings === null) {
            return Response.json({ success: false, error: 'Savings amount must be valid' }, { status: 400 })
          }
          savingsAmount = parsedSavings.toString()
        }

        const row = await updateUserGoal({
          userId: userContext.id,
          goalId,
          title: parsed.data.title?.trim(),
          targetAmount,
          currentAmount,
          savingsAmount,
          status: parsed.data.status,
          targetDate:
            parsed.data.targetDate === undefined
              ? undefined
              : parsed.data.targetDate
                ? new Date(parsed.data.targetDate)
                : null,
          note: parsed.data.note,
        })

        if (!row) {
          return Response.json({ success: false, error: 'Goal not found' }, { status: 404 })
        }

        return Response.json({ success: true, data: row })
      },
      DELETE: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const goalId = parseRouteId(params.id)
        if (!goalId) {
          return Response.json({ success: false, error: 'Invalid goal id' }, { status: 400 })
        }

        const deleted = await deleteUserGoal(userContext.id, goalId)
        if (!deleted) {
          return Response.json({ success: false, error: 'Goal not found' }, { status: 404 })
        }

        return Response.json({ success: true, data: deleted })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

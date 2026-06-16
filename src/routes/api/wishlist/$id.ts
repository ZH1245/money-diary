import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  deleteUserWishlistItem,
  updateUserWishlistItem,
} from '#/features/wishlist/server/wishlist-repository'
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

const updateWishlistSchema = z.object({
  title: apiTitleSchema.optional(),
  targetAmount: apiAmountSchema.optional(),
  currentAmount: apiAmountSchema.optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  note: apiNoteSchema.nullable(),
})

export const Route = createFileRoute('/api/wishlist/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const itemId = parseRouteId(params.id)
        if (!itemId) {
          return Response.json({ success: false, error: 'Invalid wishlist id' }, { status: 400 })
        }

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body
        const parsed = updateWishlistSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid wishlist payload', details: parsed.error.flatten() },
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

        const row = await updateUserWishlistItem({
          userId: userContext.id,
          itemId,
          title: parsed.data.title?.trim(),
          targetAmount,
          currentAmount,
          priority: parsed.data.priority,
          status: parsed.data.status,
          note: parsed.data.note,
        })

        if (!row) {
          return Response.json({ success: false, error: 'Wishlist item not found' }, { status: 404 })
        }

        return Response.json({ success: true, data: row })
      },
      DELETE: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const itemId = parseRouteId(params.id)
        if (!itemId) {
          return Response.json({ success: false, error: 'Invalid wishlist id' }, { status: 400 })
        }

        const deleted = await deleteUserWishlistItem(userContext.id, itemId)
        if (!deleted) {
          return Response.json({ success: false, error: 'Wishlist item not found' }, { status: 404 })
        }

        return Response.json({ success: true, data: deleted })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

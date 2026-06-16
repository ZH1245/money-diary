import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  createUserWishlistItem,
  getUserWishlistItems,
} from '#/features/wishlist/server/wishlist-repository'
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

const createWishlistSchema = z.object({
  title: apiTitleSchema,
  targetAmount: apiAmountSchema,
  currentAmount: apiAmountSchema.optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  note: apiNoteSchema,
  userId: apiOptionalUserIdSchema,
})

export const Route = createFileRoute('/api/wishlist')({
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

        const rows = await getUserWishlistItems(targetUserId)
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body
        const parsed = createWishlistSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid wishlist payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const targetAmount = parsePositiveAmount(parsed.data.targetAmount)
        const currentAmount = parseNonNegativeAmount(parsed.data.currentAmount ?? '0')
        if (targetAmount === null) {
          return Response.json({ success: false, error: 'Target amount must be a positive number' }, { status: 400 })
        }

        if (currentAmount === null) {
          return Response.json({ success: false, error: 'Current amount must be a valid number' }, { status: 400 })
        }

        const targetUserId = assertTargetUserId({
          requester: userContext,
          requestedUserId: parsed.data.userId,
        })
        if (targetUserId instanceof Response) return targetUserId

        const row = await createUserWishlistItem({
          userId: targetUserId,
          title: parsed.data.title,
          targetAmount: targetAmount.toString(),
          currentAmount: currentAmount.toString(),
          priority: parsed.data.priority ?? 'medium',
          status: parsed.data.status ?? 'active',
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

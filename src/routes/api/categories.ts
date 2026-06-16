import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  createUserCategory,
  getVisibleCategoriesForUser,
} from '#/features/categories/server/categories-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
  resolveTargetUserId,
} from '#/lib/server/api-guards'

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  kind: z.enum(['need', 'want', 'subscription', 'other']),
})

export const Route = createFileRoute('/api/categories')({
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

        const rows = await getVisibleCategoriesForUser(targetUserId)
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const requestedUserId = new URL(request.url).searchParams.get('userId')
        const targetUserId = resolveTargetUserId({
          requester: userContext,
          requestedUserId,
        })

        const body = await request.json().catch(() => null)
        const parsed = createCategorySchema.safeParse(body)

        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid category payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const row = await createUserCategory({
          userId: targetUserId,
          name: parsed.data.name,
          slug: parsed.data.slug,
          kind: parsed.data.kind,
        })

        return Response.json({ success: true, data: row }, { status: 201 })
      },
      OPTIONS: ({ request }) => {
        return buildOptionsResponse(request)
      },
    },
  },
})

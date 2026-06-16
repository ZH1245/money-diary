import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  createUserCategory,
  getVisibleCategoriesForUser,
} from '#/features/categories/server/categories-repository'
import { buildOptionsResponse, guardApiRequest, requireUserId } from '#/lib/server/api-guards'

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

        const userId = await requireUserId(request)
        if (userId instanceof Response) return userId

        const rows = await getVisibleCategoriesForUser(userId)
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userId = await requireUserId(request)
        if (userId instanceof Response) return userId

        const body = await request.json().catch(() => null)
        const parsed = createCategorySchema.safeParse(body)

        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid category payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const row = await createUserCategory({
          userId,
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

import { createFileRoute } from '@tanstack/react-router'
import {
  createUserCategory,
  getVisibleCategoriesForUser,
} from '#/features/categories/server/categories-repository'
import { createCategorySchema } from '#/features/categories/schemas/category'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'

export const Route = createFileRoute('/api/categories')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const rows = await getVisibleCategoriesForUser(userContext.id)
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await request.json().catch(() => null)
        const userIdRejected = rejectClientSuppliedUserId(
          request,
          body && typeof body === 'object' ? (body as Record<string, unknown>) : null,
        )
        if (userIdRejected) return userIdRejected

        const parsed = createCategorySchema.safeParse(body)

        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid category payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const row = await createUserCategory({
          userId: userContext.id,
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

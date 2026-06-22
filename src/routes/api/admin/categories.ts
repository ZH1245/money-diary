import { createFileRoute } from '@tanstack/react-router'
import {
  createGlobalCategory,
  getGlobalCategories,
} from '#/features/admin/server/global-categories-repository'
import { createCategorySchema } from '#/features/categories/schemas/category'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId } from '#/lib/server/api-guards'
import { requireAdmin } from '#/lib/server/admin-guard'

export const Route = createFileRoute('/api/admin/categories')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const rows = await getGlobalCategories()
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await request.json().catch(() => null)
        const bodyUserIdRejected = rejectClientSuppliedUserId(
          request,
          body && typeof body === 'object' ? (body as Record<string, unknown>) : null,
        )
        if (bodyUserIdRejected) return bodyUserIdRejected

        const parsed = createCategorySchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid category payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const row = await createGlobalCategory({
          name: parsed.data.name.trim(),
          slug: parsed.data.slug,
          kind: parsed.data.kind,
        })

        return Response.json({ success: true, data: row }, { status: 201 })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

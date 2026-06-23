import { createFileRoute } from '@tanstack/react-router'
import {
  deleteGlobalCategory,
  updateGlobalCategory,
} from '#/features/admin/server/global-categories-repository'
import { updateGlobalCategorySchema } from '#/features/admin/schemas/admin-settings'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId } from '#/lib/server/api-guards'
import { requireAdmin } from '#/lib/server/admin-guard'
import { parseRouteId } from '#/lib/server/parse-route-id'
import { parseJsonBody } from '#/lib/server/request-body'

export const Route = createFileRoute('/api/admin/categories/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const categoryId = parseRouteId(params.id)
        if (!categoryId) {
          return Response.json({ success: false, error: 'Invalid category id' }, { status: 400 })
        }

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

        const bodyUserIdRejected = rejectClientSuppliedUserId(request, body as Record<string, unknown>)
        if (bodyUserIdRejected) return bodyUserIdRejected

        const parsed = updateGlobalCategorySchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid category payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const row = await updateGlobalCategory({
          categoryId,
          name: parsed.data.name?.trim(),
          slug: parsed.data.slug?.trim(),
          kind: parsed.data.kind,
        })

        if (!row) {
          return Response.json({ success: false, error: 'Global category not found' }, { status: 404 })
        }

        return Response.json({ success: true, data: row })
      },
      DELETE: async ({ request, params }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const categoryId = parseRouteId(params.id)
        if (!categoryId) {
          return Response.json({ success: false, error: 'Invalid category id' }, { status: 400 })
        }

        const result = await deleteGlobalCategory(categoryId)

        if (result.status === 'not_found') {
          return Response.json({ success: false, error: 'Global category not found' }, { status: 404 })
        }

        if (result.status === 'blocked') {
          return Response.json(
            { success: false, error: 'Category is used by transactions and cannot be deleted' },
            { status: 409 },
          )
        }

        return Response.json({ success: true, data: { id: result.id } })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

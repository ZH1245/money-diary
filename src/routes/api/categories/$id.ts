import { createFileRoute } from '@tanstack/react-router'
import { deleteUserCategory } from '#/features/categories/server/categories-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'

export const Route = createFileRoute('/api/categories/$id')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const categoryId = parseRouteId(params.id)
        if (!categoryId) {
          return Response.json({ success: false, error: 'Invalid category id' }, { status: 400 })
        }

        const result = await deleteUserCategory(userContext.id, categoryId)

        if (result.status === 'not_found') {
          return Response.json({ success: false, error: 'Category not found' }, { status: 404 })
        }

        if (result.status === 'protected') {
          return Response.json(
            { success: false, error: 'Built-in categories cannot be deleted' },
            { status: 403 },
          )
        }

        if (result.status === 'blocked') {
          return Response.json(
            {
              success: false,
              error: 'Category is used by transactions and cannot be deleted',
            },
            { status: 409 },
          )
        }

        return Response.json({ success: true, data: { id: result.id } })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

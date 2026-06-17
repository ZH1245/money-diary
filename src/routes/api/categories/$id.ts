import { createFileRoute } from '@tanstack/react-router'
import { deleteUserCategory } from '#/features/categories/server/categories-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'

export const Route = createFileRoute('/api/categories/$id')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const categoryId = parseRouteId(params.id)
        if (!categoryId) {
          return Response.json({ success: false, error: 'Invalid category id' }, { status: 400 })
        }

        const result = await deleteUserCategory(userContext.id, categoryId)
        if (!result) {
          return Response.json({ success: false, error: 'Category not found' }, { status: 404 })
        }

        if ('blocked' in result) {
          return Response.json(
            {
              success: false,
              error: 'Category is used by transactions and cannot be deleted',
            },
            { status: 409 },
          )
        }

        return Response.json({ success: true, data: result })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

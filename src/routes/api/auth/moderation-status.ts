import { createFileRoute } from '@tanstack/react-router'
import { getUserModerationDetails } from '#/features/admin/server/admin-users-repository'
import { buildOptionsResponse, guardApiRequest, requireUserContext } from '#/lib/server/api-guards'

export const Route = createFileRoute('/api/auth/moderation-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const moderation = await getUserModerationDetails(userContext.id)
        if (!moderation) {
          return Response.json({ success: false, error: 'User not found' }, { status: 404 })
        }

        return Response.json({
          success: true,
          data: moderation,
        })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

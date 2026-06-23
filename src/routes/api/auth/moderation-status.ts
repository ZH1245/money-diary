import { createFileRoute } from '@tanstack/react-router'
import { getUserModerationDetails } from '#/features/admin/server/admin-users-repository'
import { auth } from '#/lib/auth'
import { buildOptionsResponse, guardApiRequest } from '#/lib/server/api-guards'

export const Route = createFileRoute('/api/auth/moderation-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const session = await auth.api.getSession({
          headers: request.headers,
        })

        const userId = session?.user?.id
        if (!userId) {
          return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const moderation = await getUserModerationDetails(userId)
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

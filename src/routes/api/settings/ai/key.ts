import { createFileRoute } from '@tanstack/react-router'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { clearUserAiApiKey, getUserAiSettings } from '#/features/settings/server/settings-repository'

export const Route = createFileRoute('/api/settings/ai/key')({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const existing = await getUserAiSettings({ userId: userContext.id })
        if (!existing?.hasApiKey) {
          return Response.json({ success: false, error: 'No API key stored' }, { status: 404 })
        }

        const cleared = await clearUserAiApiKey({ userId: userContext.id })
        if (!cleared) {
          return Response.json({ success: false, error: 'AI settings not found' }, { status: 404 })
        }

        const settings = await getUserAiSettings({ userId: userContext.id })
        return Response.json({ success: true, data: settings })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

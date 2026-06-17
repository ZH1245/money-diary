import { createFileRoute } from '@tanstack/react-router'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
} from '#/lib/server/api-guards'
import { getUserAiSettingsForRuntime } from '#/features/settings/server/settings-repository'

export const Route = createFileRoute('/api/settings/ai/reveal')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const settings = await getUserAiSettingsForRuntime({ userId: userContext.id })
        if (!settings || !settings.apiKey) {
          return Response.json({ success: false, error: 'No API key stored' }, { status: 404 })
        }

        return Response.json({
          success: true,
          data: {
            apiKey: settings.apiKey,
          },
        })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

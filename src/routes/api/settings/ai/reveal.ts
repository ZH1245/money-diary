import { createFileRoute } from '@tanstack/react-router'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
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

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        try {
          const settings = await getUserAiSettingsForRuntime({ userId: userContext.id })
          if (!settings?.apiKey) {
            return Response.json({ success: false, error: 'No API key stored' }, { status: 404 })
          }

          return Response.json({
            success: true,
            data: {
              apiKey: settings.apiKey,
            },
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to reveal API key'

          if (message.includes('Invalid encrypted payload')) {
            return Response.json(
              {
                success: false,
                error:
                  'Saved API key could not be decrypted. ENV_SECRETS may have changed — remove the key and save a new one.',
              },
              { status: 500 },
            )
          }

          return Response.json({ success: false, error: message }, { status: 500 })
        }
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

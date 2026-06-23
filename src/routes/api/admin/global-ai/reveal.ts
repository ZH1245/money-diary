import { createFileRoute } from '@tanstack/react-router'
import { getGlobalAiSettingsForRuntime } from '#/features/admin/server/global-ai-settings-repository'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId } from '#/lib/server/api-guards'
import { requireAdmin } from '#/lib/server/admin-guard'

export const Route = createFileRoute('/api/admin/global-ai/reveal')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        try {
          const settings = await getGlobalAiSettingsForRuntime()
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

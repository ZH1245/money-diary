import { createFileRoute } from '@tanstack/react-router'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { clearUserAiApiKey, getUserAiProviderPreference, tryGetUserAiSettings } from '#/features/settings/server/settings-repository'
import { getAiProviderStatusForUser } from '#/features/admin/server/resolve-ai-provider'

export const Route = createFileRoute('/api/settings/ai/key')({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const [preference, userLoad] = await Promise.all([
          getUserAiProviderPreference({ userId: userContext.id }),
          tryGetUserAiSettings({ userId: userContext.id }),
        ])

        const hasApiKey = userLoad.settings?.hasApiKey ?? preference.hasStoredApiKey
        if (!hasApiKey) {
          return Response.json({ success: false, error: 'No API key stored' }, { status: 404 })
        }

        const cleared = await clearUserAiApiKey({ userId: userContext.id })
        if (!cleared) {
          return Response.json({ success: false, error: 'AI settings not found' }, { status: 404 })
        }

        const [settingsAfterClear, providerStatusAfterClear] = await Promise.all([
          tryGetUserAiSettings({ userId: userContext.id }),
          getAiProviderStatusForUser(userContext.id),
        ])

        return Response.json({
          success: true,
          data: {
            user: settingsAfterClear.settings,
            global: providerStatusAfterClear.global,
            useGlobalProvider: providerStatusAfterClear.useGlobalProvider,
            hasCustomSettings: providerStatusAfterClear.hasCustomSettings,
            settingsWarning: settingsAfterClear.decryptError,
          },
        })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

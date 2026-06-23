import { createFileRoute } from '@tanstack/react-router'
import { clearGlobalAiApiKey, getGlobalAiSettings } from '#/features/admin/server/global-ai-settings-repository'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId } from '#/lib/server/api-guards'
import { requireAdmin } from '#/lib/server/admin-guard'

export const Route = createFileRoute('/api/admin/global-ai/key')({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const existing = await getGlobalAiSettings()
        if (!existing?.hasApiKey) {
          return Response.json({ success: false, error: 'No API key stored' }, { status: 404 })
        }

        const cleared = await clearGlobalAiApiKey()
        if (!cleared) {
          return Response.json({ success: false, error: 'Global AI settings not found' }, { status: 404 })
        }

        const settings = await getGlobalAiSettings()
        return Response.json({ success: true, data: settings })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

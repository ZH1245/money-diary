import { createFileRoute } from '@tanstack/react-router'
import {
  probeGlobalAiConnection,
  testGlobalAiSettingsSchema,
} from '#/features/settings/server/ai-connection-test'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId } from '#/lib/server/api-guards'
import { requireAdmin } from '#/lib/server/admin-guard'

export const Route = createFileRoute('/api/admin/global-ai/test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await request.json().catch(() => null)
        const parsed = testGlobalAiSettingsSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid test payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        try {
          const result = await probeGlobalAiConnection(parsed.data)
          return Response.json({ success: true, data: result })
        } catch (error) {
          console.error('[admin/global-ai/test POST]', error)
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unable to test AI provider connection',
            },
            { status: 400 },
          )
        }
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

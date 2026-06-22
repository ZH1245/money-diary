import { createFileRoute } from '@tanstack/react-router'
import {
  getGlobalAiSettings,
  getGlobalAiSettingsForRuntime,
  upsertGlobalAiSettings,
} from '#/features/admin/server/global-ai-settings-repository'
import { saveGlobalAiSettingsSchema } from '#/features/admin/schemas/admin-settings'
import { DEFAULT_GEMINI_BASE_URL } from '#/features/ai/server/gemini-client'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId, requireUserContext } from '#/lib/server/api-guards'
import { requireAdmin } from '#/lib/server/admin-guard'

export const Route = createFileRoute('/api/admin/global-ai')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const settings = await getGlobalAiSettings()
        return Response.json({ success: true, data: settings })
      },
      PATCH: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await request.json().catch(() => null)
        const bodyUserIdRejected = rejectClientSuppliedUserId(
          request,
          body && typeof body === 'object' ? (body as Record<string, unknown>) : null,
        )
        if (bodyUserIdRejected) return bodyUserIdRejected

        const parsed = saveGlobalAiSettingsSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid global AI settings payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        try {
          if (parsed.data.provider === 'ollama') {
            await upsertGlobalAiSettings({
              adminUserId: userContext.id,
              isEnabled: parsed.data.isEnabled,
              provider: 'ollama',
              baseUrl: parsed.data.baseUrl,
              model: parsed.data.model,
              apiKey: parsed.data.apiKey,
            })
          } else if (parsed.data.provider === 'openrouter') {
            const existing = await getGlobalAiSettingsForRuntime()
            const nextApiKey = parsed.data.apiKey?.trim() || existing?.apiKey
            if (!nextApiKey) {
              return Response.json({ success: false, error: 'OpenRouter API key is required' }, { status: 400 })
            }

            await upsertGlobalAiSettings({
              adminUserId: userContext.id,
              isEnabled: parsed.data.isEnabled,
              provider: 'openrouter',
              baseUrl: parsed.data.baseUrl,
              model: parsed.data.model,
              apiKey: nextApiKey,
            })
          } else {
            const existing = await getGlobalAiSettingsForRuntime()
            const nextApiKey = parsed.data.apiKey?.trim() || existing?.apiKey
            if (!nextApiKey) {
              return Response.json({ success: false, error: 'Gemini API key is required' }, { status: 400 })
            }

            await upsertGlobalAiSettings({
              adminUserId: userContext.id,
              isEnabled: parsed.data.isEnabled,
              provider: 'gemini',
              baseUrl: DEFAULT_GEMINI_BASE_URL,
              model: parsed.data.model,
              apiKey: nextApiKey,
            })
          }

          const settings = await getGlobalAiSettings()
          return Response.json({ success: true, data: settings })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to save global AI settings'
          return Response.json({ success: false, error: message }, { status: 500 })
        }
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

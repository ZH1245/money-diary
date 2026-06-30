import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getGlobalAiSettingsForRuntime } from '#/features/admin/server/global-ai-settings-repository'
import { fetchOpenRouterModels } from '#/features/ai/server/openrouter-client'
import { OPENROUTER_DEFAULT_BASE_URL } from '#/features/settings/constants/openrouter-defaults'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId } from '#/lib/server/api-guards'
import { requireAdmin } from '#/lib/server/admin-guard'
import { parseJsonBody } from '#/lib/server/request-body'

const openRouterModelsQuerySchema = z.object({
  baseUrl: z.string().trim().url().optional(),
  apiKey: z.string().trim().optional(),
  useStoredKey: z.literal(true).optional(),
})

export const Route = createFileRoute('/api/admin/global-ai/openrouter-models')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

        const parsed = openRouterModelsQuerySchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const stored = parsed.data.useStoredKey ? await getGlobalAiSettingsForRuntime() : null
        const apiKey = parsed.data.apiKey?.trim() || stored?.apiKey || ''
        const baseUrl = parsed.data.baseUrl?.trim() || stored?.baseUrl || OPENROUTER_DEFAULT_BASE_URL

        if (!apiKey) {
          return Response.json({ success: false, error: 'OpenRouter API key is required' }, { status: 400 })
        }

        const catalog = await fetchOpenRouterModels({ baseUrl, apiKey })
        if (!catalog.ok) {
          return Response.json({ success: false, error: catalog.error }, { status: 502 })
        }

        return Response.json({ success: true, data: catalog.models })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

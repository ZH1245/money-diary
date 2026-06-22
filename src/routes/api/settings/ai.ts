import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
} from '#/lib/server/api-guards'
import { getUserAiSettings, getUserAiSettingsForRuntime, upsertUserAiSettings } from '#/features/settings/server/settings-repository'
import { DEFAULT_GEMINI_BASE_URL } from '#/features/ai/server/gemini-client'

const saveOllamaSettingsSchema = z.object({
  provider: z.literal('ollama'),
  baseUrl: z.string().trim().url('Enter a valid URL'),
  model: z.string().trim().min(1, 'Model is required'),
  apiKey: z.string().trim().optional(),
})

const saveGeminiSettingsSchema = z.object({
  provider: z.literal('gemini'),
  model: z.string().trim().min(1, 'Model is required'),
  apiKey: z.string().trim().optional(),
})

const saveAiSettingsSchema = z.discriminatedUnion('provider', [
  saveOllamaSettingsSchema,
  saveGeminiSettingsSchema,
])

export const Route = createFileRoute('/api/settings/ai')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const settings = await getUserAiSettings({ userId: userContext.id })
        return Response.json({ success: true, data: settings })
      },
      PATCH: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await request.json().catch(() => null)
        const parsed = saveAiSettingsSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid AI settings payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        if (parsed.data.provider === 'ollama') {
          await upsertUserAiSettings({
            userId: userContext.id,
            provider: 'ollama',
            baseUrl: parsed.data.baseUrl,
            model: parsed.data.model,
            apiKey: parsed.data.apiKey,
          })
        } else {
          const existing = await getUserAiSettingsForRuntime({ userId: userContext.id })
          const nextApiKey = parsed.data.apiKey?.trim() || existing?.apiKey

          if (!nextApiKey) {
            return Response.json(
              { success: false, error: 'Gemini API key is required' },
              { status: 400 },
            )
          }

          await upsertUserAiSettings({
            userId: userContext.id,
            provider: 'gemini',
            baseUrl: DEFAULT_GEMINI_BASE_URL,
            model: parsed.data.model,
            apiKey: nextApiKey,
          })
        }

        const settings = await getUserAiSettings({ userId: userContext.id })
        return Response.json({ success: true, data: settings })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

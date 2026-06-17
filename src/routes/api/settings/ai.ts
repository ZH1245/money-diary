import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
} from '#/lib/server/api-guards'
import { getUserAiSettings, upsertUserAiSettings } from '#/features/settings/server/settings-repository'

const saveAiSettingsSchema = z.object({
  provider: z.literal('ollama'),
  baseUrl: z.string().trim().url('Enter a valid URL'),
  model: z.string().trim().min(1, 'Model is required'),
  apiKey: z.string().trim().optional(),
})

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

        await upsertUserAiSettings({
          userId: userContext.id,
          provider: 'ollama',
          baseUrl: parsed.data.baseUrl,
          model: parsed.data.model,
          apiKey: parsed.data.apiKey,
        })

        const settings = await getUserAiSettings({ userId: userContext.id })
        return Response.json({ success: true, data: settings })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

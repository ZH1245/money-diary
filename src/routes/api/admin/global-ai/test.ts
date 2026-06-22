import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { probeGeminiApiKey } from '#/features/ai/server/gemini-client'
import { probeOllamaBaseUrl } from '#/features/ai/server/ollama-client'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId } from '#/lib/server/api-guards'
import { requireAdmin } from '#/lib/server/admin-guard'

const testGlobalAiSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('ollama'),
    baseUrl: z.string().trim().url('Enter a valid URL'),
    apiKey: z.string().trim().optional(),
  }),
  z.object({
    provider: z.literal('gemini'),
    apiKey: z.string().trim().min(1, 'Gemini API key is required'),
  }),
])

export const Route = createFileRoute('/api/admin/global-ai/test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const adminResponse = await requireAdmin(request)
        if (adminResponse) return adminResponse

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await request.json().catch(() => null)
        const parsed = testGlobalAiSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid test payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const result =
          parsed.data.provider === 'gemini'
            ? await probeGeminiApiKey({ apiKey: parsed.data.apiKey })
            : await probeOllamaBaseUrl({ baseUrl: parsed.data.baseUrl, apiKey: parsed.data.apiKey })

        return Response.json({ success: true, data: result })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

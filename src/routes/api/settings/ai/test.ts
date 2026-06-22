import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { probeOllamaBaseUrl } from '#/features/ai/server/ollama-client'
import { probeGeminiApiKey } from '#/features/ai/server/gemini-client'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'

const testOllamaSchema = z.object({
  provider: z.literal('ollama'),
  baseUrl: z.string().trim().url('Enter a valid URL'),
  apiKey: z.string().trim().optional(),
})

const testGeminiSchema = z.object({
  provider: z.literal('gemini'),
  apiKey: z.string().trim().min(1, 'Gemini API key is required'),
})

const testAiSettingsSchema = z.discriminatedUnion('provider', [testOllamaSchema, testGeminiSchema])

export const Route = createFileRoute('/api/settings/ai/test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

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

        const parsed = testAiSettingsSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid test payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const result =
          parsed.data.provider === 'gemini'
            ? await probeGeminiApiKey({ apiKey: parsed.data.apiKey })
            : await probeOllamaBaseUrl({
                baseUrl: parsed.data.baseUrl,
                apiKey: parsed.data.apiKey,
              })

        return Response.json({
          success: true,
          data: result,
        })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

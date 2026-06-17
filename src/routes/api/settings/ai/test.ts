import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { probeOllamaBaseUrl } from '#/features/ai/server/ollama-client'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
} from '#/lib/server/api-guards'

const testAiBaseUrlSchema = z.object({
  baseUrl: z.string().trim().url('Enter a valid URL'),
  apiKey: z.string().trim().optional(),
})

export const Route = createFileRoute('/api/settings/ai/test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await request.json().catch(() => null)
        const parsed = testAiBaseUrlSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid test payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const result = await probeOllamaBaseUrl({
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

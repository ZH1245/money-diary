import { createFileRoute } from '@tanstack/react-router'
import {
  probeUserAiConnection,
  testUserAiSettingsSchema,
} from '#/features/settings/server/ai-connection-test'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'

export const Route = createFileRoute('/api/settings/ai/test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
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

        const parsed = testUserAiSettingsSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid test payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        try {
          const result = await probeUserAiConnection({
            userId: userContext.id,
            payload: parsed.data,
          })

          return Response.json({
            success: true,
            data: result,
          })
        } catch (error) {
          console.error('[settings/ai/test POST]', error)
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

import { createFileRoute } from '@tanstack/react-router'
import { createUserAiConversation, listUserAiConversations } from '#/features/ai/server/ai-conversations-repository'
import { createAiConversationSchema } from '#/features/ai/schemas/ai-conversation'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'

export const Route = createFileRoute('/api/ai/conversations')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const conversations = await listUserAiConversations({ userId: userContext.id })
        return Response.json({
          success: true,
          data: conversations.map((conversation) => ({
            id: conversation.id,
            title: conversation.title,
            isClosed: conversation.isClosed,
            createdAt: conversation.createdAt?.toISOString() ?? null,
            updatedAt: conversation.updatedAt?.toISOString() ?? null,
          })),
        })
      },
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

        const bodyUserIdRejected = rejectClientSuppliedUserId(request, body as Record<string, unknown>)
        if (bodyUserIdRejected) return bodyUserIdRejected

        const parsed = createAiConversationSchema.safeParse(body ?? {})
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid conversation payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const conversation = await createUserAiConversation({
          userId: userContext.id,
          title: parsed.data.title ?? 'New chat',
        })

        return Response.json(
          {
            success: true,
            data: {
              id: conversation.id,
              title: conversation.title,
              isClosed: conversation.isClosed,
              createdAt: conversation.createdAt?.toISOString() ?? null,
              updatedAt: conversation.updatedAt?.toISOString() ?? null,
              messages: [],
            },
          },
          { status: 201 },
        )
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

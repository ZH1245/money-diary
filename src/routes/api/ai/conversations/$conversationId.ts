import { createFileRoute } from '@tanstack/react-router'
import {
  deleteUserAiConversation,
  getUserAiConversation,
  parseAiMessageMetadata,
} from '#/features/ai/server/ai-conversations-repository'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'

export const Route = createFileRoute('/api/ai/conversations/$conversationId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const conversationId = parseRouteId(params.conversationId)
        if (!conversationId) {
          return Response.json({ success: false, error: 'Invalid conversation id' }, { status: 400 })
        }

        const record = await getUserAiConversation({
          userId: userContext.id,
          conversationId,
        })

        if (!record) {
          return Response.json({ success: false, error: 'Conversation not found.' }, { status: 404 })
        }

        return Response.json({
          success: true,
          data: {
            id: record.conversation.id,
            title: record.conversation.title,
            isClosed: record.conversation.isClosed,
            createdAt: record.conversation.createdAt?.toISOString() ?? null,
            updatedAt: record.conversation.updatedAt?.toISOString() ?? null,
            messages: record.messages.map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              metadata: parseAiMessageMetadata(message.metadata),
              createdAt: message.createdAt?.toISOString() ?? null,
            })),
          },
        })
      },
      DELETE: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const conversationId = parseRouteId(params.conversationId)
        if (!conversationId) {
          return Response.json({ success: false, error: 'Invalid conversation id' }, { status: 400 })
        }

        const deleted = await deleteUserAiConversation({
          userId: userContext.id,
          conversationId,
        })

        if (!deleted) {
          return Response.json({ success: false, error: 'Conversation not found.' }, { status: 404 })
        }

        return Response.json({ success: true })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

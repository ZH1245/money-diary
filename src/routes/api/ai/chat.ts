import { createFileRoute } from '@tanstack/react-router'
import { runAiChat } from '#/features/ai/server/ai-chat-service'
import {
  appendAiConversationMessage,
  closeUserAiConversation,
  createUserAiConversation,
  getAiConversationModelMessages,
  getUserAiConversation,
  maybeSetAiConversationTitle,
  trimAiConversationMessages,
} from '#/features/ai/server/ai-conversations-repository'
import { aiChatRequestSchema } from '#/features/ai/schemas/ai-conversation'
import type { AiMessageMetadata } from '#/features/ai/types/ai-conversation'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'
import { sanitizeAssistantUserFacingMessage } from '#/features/ai/server/ai-security'
import { formatAiProviderError, resolveUnexpectedChatError } from '#/features/ai/server/format-ai-provider-error'

export const Route = createFileRoute('/api/ai/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body

        const bodyUserIdRejected = rejectClientSuppliedUserId(request, body as Record<string, unknown>)
        if (bodyUserIdRejected) return bodyUserIdRejected

        const parsed = aiChatRequestSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const { message } = parsed.data
        let conversationId = parsed.data.conversationId

        try {
        if (conversationId) {
          const existing = await getUserAiConversation({
            userId: userContext.id,
            conversationId,
          })
          if (!existing) {
            return Response.json({ success: false, error: 'Conversation not found.' }, { status: 404 })
          }
          if (existing.conversation.isClosed) {
            return Response.json(
              {
                success: false,
                closeChat: true,
                conversationId,
                error: 'This chat is closed due to repeated unsafe requests.',
              },
              { status: 403 },
            )
          }
        } else {
          const created = await createUserAiConversation({ userId: userContext.id })
          conversationId = created.id
        }

        await appendAiConversationMessage({
          userId: userContext.id,
          conversationId,
          role: 'user',
          content: message,
        })

        await maybeSetAiConversationTitle({
          userId: userContext.id,
          conversationId,
          title: message,
        })

        const messages = await getAiConversationModelMessages(userContext.id, conversationId)

        const result = await runAiChat({
          userId: userContext.id,
          currency: userContext.currency,
          messages,
        })

        const userFacingError = result.error
          ? formatAiProviderError(result.error)
          : undefined

        const assistantMetadata: AiMessageMetadata =
          result.action === 'provider_error' || (userFacingError && !result.success)
            ? { action: 'provider_error', ok: false }
            : {
                action: result.action,
                ok:
                  result.action !== 'clarification' &&
                  (result.steps?.length ? result.steps.every((step) => step.success) : result.success),
                steps: result.steps?.map((step) => ({
                  action: step.action,
                  success: step.success,
                })),
              }

        const assistantContent = sanitizeAssistantUserFacingMessage(
          result.message ??
            userFacingError ??
            (result.action === 'clarification' ? 'Could you clarify?' : 'Something went wrong.'),
        )

        await appendAiConversationMessage({
          userId: userContext.id,
          conversationId,
          role: 'assistant',
          content: assistantContent,
          metadata: assistantMetadata,
        })

        await trimAiConversationMessages(userContext.id, conversationId)

        if (result.closeChat) {
          await closeUserAiConversation({
            userId: userContext.id,
            conversationId,
          })
        }

        const responseBody = {
          ...result,
          conversationId,
          error: userFacingError ?? result.error,
          message: result.message
            ? sanitizeAssistantUserFacingMessage(result.message)
            : userFacingError,
        }

        if (result.closeChat) {
          return Response.json(responseBody, { status: 403 })
        }

        if (!result.success && result.blocked) {
          return Response.json(responseBody, { status: 403 })
        }

        if (result.action === 'provider_error' || (!result.success && userFacingError)) {
          return Response.json(responseBody, { status: 200 })
        }

        if (!result.success && result.error && /Ollama|Gemini/.test(result.error)) {
          return Response.json(responseBody, {
            status: result.error.includes('Could not reach') ? 503 : 502,
          })
        }

        const hasWrites = result.steps?.some((step) => step.success) ?? false
        const status = hasWrites ? 201 : 200

        return Response.json(responseBody, { status })
        } catch (error) {
          console.error('[api/ai/chat]', error)
          const userFacingError = resolveUnexpectedChatError(error)

          if (conversationId) {
            try {
              await appendAiConversationMessage({
                userId: userContext.id,
                conversationId,
                role: 'assistant',
                content: sanitizeAssistantUserFacingMessage(userFacingError),
                metadata: { action: 'provider_error', ok: false },
              })
            } catch (persistError) {
              console.error('[api/ai/chat] failed to persist assistant error', persistError)
            }
          }

          return Response.json(
            {
              success: false,
              conversationId,
              action: 'provider_error',
              error: userFacingError,
              message: userFacingError,
            },
            { status: conversationId ? 200 : 503 },
          )
        }
      },

      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

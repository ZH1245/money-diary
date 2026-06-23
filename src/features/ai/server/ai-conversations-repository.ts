import { and, desc, eq, exists } from 'drizzle-orm'
import { db } from '#/db/index'
import { aiConversations, aiMessages } from '#/db/schema'
import type { AiMessageMetadata } from '#/features/ai/types/ai-conversation'
import { AI_CHAT_HISTORY_MESSAGE_LIMIT } from '#/features/ai/server/ai-history-window'
import { userOwnsAiConversation } from '#/lib/server/ownership-guards'

const MAX_MESSAGES_PER_CONVERSATION = 100

/**
 * Lists recent AI conversations for one user.
 */
export async function listUserAiConversations({
  userId,
  limit = 30,
}: {
  userId: string
  limit?: number
}) {
  return db
    .select({
      id: aiConversations.id,
      title: aiConversations.title,
      isClosed: aiConversations.isClosed,
      createdAt: aiConversations.createdAt,
      updatedAt: aiConversations.updatedAt,
    })
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        exists(
          db
            .select({ id: aiMessages.id })
            .from(aiMessages)
            .where(eq(aiMessages.conversationId, aiConversations.id)),
        ),
      ),
    )
    .orderBy(desc(aiConversations.updatedAt))
    .limit(limit)
}

/**
 * Loads one conversation with messages when it belongs to the user.
 */
export async function getUserAiConversation({
  userId,
  conversationId,
}: {
  userId: string
  conversationId: number
}) {
  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
    .limit(1)

  if (!conversation) return null

  const messages = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(aiMessages.createdAt)

  return {
    conversation,
    messages,
  }
}

/**
 * Creates an empty AI conversation for a user.
 */
export async function createUserAiConversation({
  userId,
  title = 'New chat',
}: {
  userId: string
  title?: string
}) {
  const [row] = await db
    .insert(aiConversations)
    .values({
      userId,
      title,
    })
    .returning()

  return row
}

/**
 * Appends a message to a conversation owned by the user and bumps updatedAt.
 */
export async function appendAiConversationMessage({
  userId,
  conversationId,
  role,
  content,
  metadata,
}: {
  userId: string
  conversationId: number
  role: 'user' | 'assistant'
  content: string
  metadata?: AiMessageMetadata | null
}) {
  if (!(await userOwnsAiConversation(userId, conversationId))) {
    return null
  }

  const [message] = await db
    .insert(aiMessages)
    .values({
      conversationId,
      role,
      content,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
    .returning()

  await db
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))

  return message
}

/**
 * Loads the most recent chat messages for the model (bounded by AI_CHAT_HISTORY_MESSAGE_LIMIT).
 */
export async function getAiConversationModelMessages(userId: string, conversationId: number) {
  if (!(await userOwnsAiConversation(userId, conversationId))) {
    return []
  }

  const messages = await db
    .select({
      role: aiMessages.role,
      content: aiMessages.content,
    })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(desc(aiMessages.createdAt))
    .limit(AI_CHAT_HISTORY_MESSAGE_LIMIT)

  return [...messages]
    .reverse()
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    }))
}

/**
 * Updates conversation title from the first user message when the user owns it.
 */
export async function maybeSetAiConversationTitle({
  userId,
  conversationId,
  title,
}: {
  userId: string
  conversationId: number
  title: string
}) {
  const trimmed = title.trim().slice(0, 80)
  if (!trimmed) return false

  const result = await db
    .update(aiConversations)
    .set({
      title: trimmed,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId),
        eq(aiConversations.title, 'New chat'),
      ),
    )
    .returning({ id: aiConversations.id })

  return result.length > 0
}

/**
 * Marks a conversation as closed after abuse detection.
 */
export async function closeUserAiConversation({
  userId,
  conversationId,
}: {
  userId: string
  conversationId: number
}) {
  await db
    .update(aiConversations)
    .set({
      isClosed: true,
      updatedAt: new Date(),
    })
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
}

/**
 * Deletes a conversation owned by the user.
 */
export async function deleteUserAiConversation({
  userId,
  conversationId,
}: {
  userId: string
  conversationId: number
}) {
  const result = await db
    .delete(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
    .returning({ id: aiConversations.id })

  return result.length > 0
}

/**
 * Trims old messages when a conversation grows too large (user-owned only).
 */
export async function trimAiConversationMessages(userId: string, conversationId: number) {
  if (!(await userOwnsAiConversation(userId, conversationId))) {
    return
  }

  const messages = await db
    .select({ id: aiMessages.id })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(desc(aiMessages.createdAt))

  if (messages.length <= MAX_MESSAGES_PER_CONVERSATION) return

  const staleIds = messages.slice(MAX_MESSAGES_PER_CONVERSATION).map((message) => message.id)
  for (const staleId of staleIds) {
    await db.delete(aiMessages).where(eq(aiMessages.id, staleId))
  }
}

/**
 * Parses stored metadata JSON for one message row.
 */
export function parseAiMessageMetadata(raw: string | null): AiMessageMetadata | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AiMessageMetadata
  } catch {
    return null
  }
}

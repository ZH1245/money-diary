import { and, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import { aiConversations } from '#/db/schema'

/**
 * Returns true when an AI conversation belongs to the authenticated user.
 */
export async function userOwnsAiConversation(userId: string, conversationId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: aiConversations.id })
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
    .limit(1)

  return Boolean(row)
}

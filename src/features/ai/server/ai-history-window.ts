/** Max user/assistant turns loaded from DB and sent to the model per chat request. */
export const AI_CHAT_HISTORY_MESSAGE_LIMIT = 12

const MAX_MESSAGE_CONTENT_CHARS = 1200

/**
 * Trims and caps chat history before it is sent to the model.
 */
export function sanitizeChatMessages(messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .slice(-AI_CHAT_HISTORY_MESSAGE_LIMIT)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, MAX_MESSAGE_CONTENT_CHARS),
    }))
}

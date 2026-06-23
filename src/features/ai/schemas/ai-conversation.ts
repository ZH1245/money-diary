import { z } from 'zod'
import {
  AI_CHAT_MESSAGE_LIMIT_BULK,
  getMessageContentCharLimit,
} from '#/features/ai/utils/ai-bulk-paste'

export const aiChatRequestSchema = z.object({
  conversationId: z.number().int().positive().optional(),
  message: z
    .string()
    .trim()
    .min(1)
    .max(AI_CHAT_MESSAGE_LIMIT_BULK)
    .refine((message) => message.length <= getMessageContentCharLimit(message), {
      message: 'Message is too long.',
    }),
})

export const createAiConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
})

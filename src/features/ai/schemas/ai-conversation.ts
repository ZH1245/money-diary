import { z } from 'zod'

export const aiChatRequestSchema = z.object({
  conversationId: z.number().int().positive().optional(),
  message: z.string().trim().min(1).max(1200),
})

export const createAiConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
})

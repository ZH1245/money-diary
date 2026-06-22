import { z } from 'zod'
import { apiAmountSchema, apiNoteSchema, apiTitleSchema } from '#/lib/server/validation-schemas'

export const createWishlistSchema = z.object({
  title: apiTitleSchema,
  targetAmount: apiAmountSchema,
  currentAmount: apiAmountSchema.optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  note: apiNoteSchema,
})

export const updateWishlistSchema = z.object({
  title: apiTitleSchema.optional(),
  targetAmount: apiAmountSchema.optional(),
  currentAmount: apiAmountSchema.optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  note: apiNoteSchema.nullable(),
})

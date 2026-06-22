import { z } from 'zod'
import { apiAmountSchema, apiNoteSchema, apiTitleSchema } from '#/lib/server/validation-schemas'

export const createGoalSchema = z.object({
  title: apiTitleSchema,
  targetAmount: apiAmountSchema,
  currentAmount: apiAmountSchema.optional(),
  savingsAmount: apiAmountSchema.optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  targetDate: z.string().datetime().optional(),
  note: apiNoteSchema,
})

export const updateGoalSchema = z.object({
  title: apiTitleSchema.optional(),
  targetAmount: apiAmountSchema.optional(),
  currentAmount: apiAmountSchema.optional(),
  savingsAmount: apiAmountSchema.optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  targetDate: z.string().datetime().nullable().optional(),
  note: apiNoteSchema.nullable(),
})

import { z } from 'zod'
import { apiAmountSchema, apiNoteSchema, apiTitleSchema } from '#/lib/server/validation-schemas'

export const createSavingSchema = z.object({
  title: apiTitleSchema.optional(),
  amount: apiAmountSchema,
  note: apiNoteSchema,
  savedAt: z.string().datetime().optional(),
  goalId: z.number().int().positive().nullable().optional(),
  paymentAccountId: z.number().int().positive().nullable().optional(),
})

export const updateSavingSchema = z.object({
  title: apiTitleSchema.optional(),
  amount: apiAmountSchema.optional(),
  note: apiNoteSchema.nullable(),
  savedAt: z.string().datetime().optional(),
  goalId: z.number().int().positive().nullable().optional(),
  paymentAccountId: z.number().int().positive().nullable().optional(),
})

export const DEFAULT_SAVING_TITLE = 'Savings deposit'

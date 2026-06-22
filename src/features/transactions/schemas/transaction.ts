import { z } from 'zod'
import {
  apiAmountSchema,
  apiNoteSchema,
  apiSourceSchema,
  apiTitleSchema,
} from '#/lib/server/validation-schemas'

export const createTransactionSchema = z.object({
  title: z.string().min(1),
  amount: z.string().min(1),
  currency: z.string().trim().length(3).optional(),
  exchangeRate: z.string().trim().min(1).optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  categoryId: z.number().int().positive().nullable().optional(),
  paymentAccountId: z.number().int().positive().nullable().optional(),
  source: z.string().optional(),
  note: z.string().optional(),
  happenedAt: z.string().datetime().optional(),
})

export const updateTransactionSchema = z.object({
  title: apiTitleSchema.optional(),
  amount: apiAmountSchema.optional(),
  currency: z.string().trim().length(3).optional(),
  exchangeRate: z.string().trim().min(1).optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  paymentAccountId: z.number().int().positive().nullable().optional(),
  source: apiSourceSchema.nullable(),
  note: apiNoteSchema.nullable(),
  happenedAt: z.string().datetime().optional(),
})

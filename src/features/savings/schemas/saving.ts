import { z } from 'zod'
import { apiAmountSchema, apiNoteSchema, apiTitleSchema } from '#/lib/server/validation-schemas'
import { SAVING_ENTRY_TYPES } from '#/features/savings/utils/saving-ledger'

export const savingEntryTypeSchema = z.enum(SAVING_ENTRY_TYPES)

export const createSavingSchema = z.object({
  title: apiTitleSchema.optional(),
  amount: apiAmountSchema,
  entryType: savingEntryTypeSchema.optional(),
  note: apiNoteSchema,
  savedAt: z.string().datetime().optional(),
  goalId: z.number().int().positive().nullable().optional(),
  paymentAccountId: z.number().int().positive().nullable().optional(),
})

export const updateSavingSchema = z.object({
  title: apiTitleSchema.optional(),
  amount: apiAmountSchema.optional(),
  entryType: savingEntryTypeSchema.optional(),
  note: apiNoteSchema.nullable(),
  savedAt: z.string().datetime().optional(),
  goalId: z.number().int().positive().nullable().optional(),
  paymentAccountId: z.number().int().positive().nullable().optional(),
})

export const DEFAULT_SAVING_TITLE = 'Savings deposit'
export const DEFAULT_SAVING_WITHDRAWAL_TITLE = 'Savings withdrawal'

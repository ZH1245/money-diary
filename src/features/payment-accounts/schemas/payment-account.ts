import { z } from 'zod'
import { PAYMENT_INSTITUTIONS } from '#/features/payment-accounts/constants/institutions'
import { PAYMENT_ACCOUNT_TYPES } from '#/features/payment-accounts/types/payment-account'
import { apiNoteSchema, apiTitleSchema } from '#/lib/server/validation-schemas'

const institutionSlugs = PAYMENT_INSTITUTIONS.map((institution) => institution.slug) as readonly string[]

const institutionSlugSchema = z
  .string()
  .nullable()
  .optional()
  .refine((value) => value === undefined || value === null || institutionSlugs.includes(value), {
    message: 'Invalid institution',
  })

export const createPaymentAccountSchema = z.object({
  name: apiTitleSchema,
  institutionSlug: institutionSlugSchema,
  accountType: z.enum(PAYMENT_ACCOUNT_TYPES),
  lastFour: z
    .string()
    .trim()
    .regex(/^\d{4}$/)
    .nullable()
    .optional(),
  note: apiNoteSchema.nullable().optional(),
})

export const updatePaymentAccountSchema = z.object({
  name: apiTitleSchema.optional(),
  institutionSlug: institutionSlugSchema,
  accountType: z.enum(PAYMENT_ACCOUNT_TYPES).optional(),
  lastFour: z
    .string()
    .trim()
    .regex(/^\d{4}$/)
    .nullable()
    .optional(),
  note: apiNoteSchema.nullable(),
  isActive: z.boolean().optional(),
})

import { z } from 'zod'
import { SECURITY_QUESTIONS } from '#/features/auth/constants/security-questions'

const securityQuestionKeySchema = z.enum(
  SECURITY_QUESTIONS.map((question) => question.key) as [
    (typeof SECURITY_QUESTIONS)[number]['key'],
    ...(typeof SECURITY_QUESTIONS)[number]['key'][],
  ],
)

const securityAnswerSchema = z.string().trim().min(2, 'Answer must be at least 2 characters').max(120)

const recoveryEmailSchema = z.string().trim().email('Enter a valid recovery email')

export const createSecurityProfileSchema = z.object({
  recoveryEmail: recoveryEmailSchema,
  questionOneKey: securityQuestionKeySchema,
  answerOne: securityAnswerSchema,
})

export const updateSecurityProfileSchema = z.object({
  currentPassword: z.string().min(8, 'Current password is required'),
  recoveryEmail: recoveryEmailSchema.optional(),
  questionOneKey: securityQuestionKeySchema.optional(),
  answerOne: securityAnswerSchema.optional(),
})

export const recoveryChallengeSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

export const recoveryResetSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  answerOne: securityAnswerSchema,
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Current password must be at least 8 characters'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    answerOne: securityAnswerSchema.optional(),
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: 'New password must be different from your current password',
    path: ['newPassword'],
  })

export const changePasswordFormSchema = changePasswordSchema
  .extend({
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Confirm password must match the new password',
    path: ['confirmPassword'],
  })

import { z } from 'zod'
import { USER_ACCOUNT_STATUSES } from '#/features/admin/types/admin-user'

export const moderateAdminUserSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('restrict'),
    reason: z.string().trim().min(3, 'Restriction reason must be at least 3 characters'),
  }),
  z.object({
    action: z.literal('ban'),
    reason: z.string().trim().min(3, 'Ban reason must be at least 3 characters'),
  }),
  z.object({
    action: z.literal('restore'),
  }),
])

export const adminUserAccountStatusSchema = z.enum(USER_ACCOUNT_STATUSES)

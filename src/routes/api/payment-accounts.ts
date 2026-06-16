import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PAYMENT_INSTITUTIONS } from '#/features/payment-accounts/constants/institutions'
import {
  createUserPaymentAccount,
  getUserPaymentAccounts,
} from '#/features/payment-accounts/server/payment-accounts-repository'
import { PAYMENT_ACCOUNT_TYPES } from '#/features/payment-accounts/types/payment-account'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
  resolveTargetUserId,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'
import { apiNoteSchema, apiTitleSchema } from '#/lib/server/validation-schemas'

const institutionSlugs = PAYMENT_INSTITUTIONS.map((institution) => institution.slug)

const institutionSlugSchema = z
  .string()
  .nullable()
  .optional()
  .refine((value) => value === undefined || value === null || institutionSlugs.includes(value), {
    message: 'Invalid institution',
  })

const createPaymentAccountSchema = z.object({
  name: apiTitleSchema,
  institutionSlug: institutionSlugSchema,
  accountType: z.enum(PAYMENT_ACCOUNT_TYPES),
  lastFour: z
    .string()
    .trim()
    .regex(/^\d{4}$/)
    .nullable()
    .optional(),
  note: apiNoteSchema,
})

export const Route = createFileRoute('/api/payment-accounts')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const requestedUserId = new URL(request.url).searchParams.get('userId')
        const targetUserId = resolveTargetUserId({
          requester: userContext,
          requestedUserId,
        })

        const rows = await getUserPaymentAccounts(targetUserId)
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body
        const parsed = createPaymentAccountSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid payment account payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const row = await createUserPaymentAccount({
          userId: userContext.id,
          name: parsed.data.name.trim(),
          institutionSlug: parsed.data.institutionSlug ?? null,
          accountType: parsed.data.accountType,
          lastFour: parsed.data.lastFour ?? null,
          note: parsed.data.note?.trim() || null,
        })

        return Response.json({ success: true, data: row }, { status: 201 })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

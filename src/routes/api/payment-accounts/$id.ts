import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PAYMENT_INSTITUTIONS } from '#/features/payment-accounts/constants/institutions'
import {
  deleteUserPaymentAccount,
  updateUserPaymentAccount,
} from '#/features/payment-accounts/server/payment-accounts-repository'
import { PAYMENT_ACCOUNT_TYPES } from '#/features/payment-accounts/types/payment-account'
import { buildOptionsResponse, guardApiRequest, requireUserContext } from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'
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

const updatePaymentAccountSchema = z.object({
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

export const Route = createFileRoute('/api/payment-accounts/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const paymentAccountId = parseRouteId(params.id)
        if (!paymentAccountId) {
          return Response.json({ success: false, error: 'Invalid payment account id' }, { status: 400 })
        }

        const body = await parseJsonBody(request)
        if (body instanceof Response) return body
        const parsed = updatePaymentAccountSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid payment account payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const row = await updateUserPaymentAccount({
          userId: userContext.id,
          paymentAccountId,
          name: parsed.data.name?.trim(),
          institutionSlug: parsed.data.institutionSlug,
          accountType: parsed.data.accountType,
          lastFour: parsed.data.lastFour,
          note: parsed.data.note,
          isActive: parsed.data.isActive,
        })

        if (!row) {
          return Response.json({ success: false, error: 'Payment account not found' }, { status: 404 })
        }

        return Response.json({ success: true, data: row })
      },
      DELETE: async ({ request, params }) => {
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const paymentAccountId = parseRouteId(params.id)
        if (!paymentAccountId) {
          return Response.json({ success: false, error: 'Invalid payment account id' }, { status: 400 })
        }

        const deleted = await deleteUserPaymentAccount(userContext.id, paymentAccountId)
        if (!deleted) {
          return Response.json({ success: false, error: 'Payment account not found' }, { status: 404 })
        }

        return Response.json({ success: true, data: deleted })
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

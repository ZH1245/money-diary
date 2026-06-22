import { createFileRoute } from '@tanstack/react-router'
import {
  deleteUserPaymentAccount,
  getUserPaymentAccountById,
  updateUserPaymentAccount,
} from '#/features/payment-accounts/server/payment-accounts-repository'
import { isProtectedPaymentAccount } from '#/features/payment-accounts/utils/protected-account'
import { updatePaymentAccountSchema } from '#/features/payment-accounts/schemas/payment-account'
import { buildOptionsResponse, guardApiRequest, requireUserContext } from '#/lib/server/api-guards'
import { parseRouteId } from '#/lib/server/parse-route-id'
import { parseJsonBody } from '#/lib/server/request-body'

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

        const existing = await getUserPaymentAccountById(userContext.id, paymentAccountId)
        if (!existing) {
          return Response.json({ success: false, error: 'Payment account not found' }, { status: 404 })
        }

        if (isProtectedPaymentAccount(existing)) {
          return Response.json(
            { success: false, error: 'Built-in accounts like Cash on hand cannot be deleted.' },
            { status: 403 },
          )
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

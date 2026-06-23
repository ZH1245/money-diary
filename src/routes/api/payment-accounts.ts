import { createFileRoute } from '@tanstack/react-router'
import {
  createUserPaymentAccount,
  getUserPaymentAccounts,
} from '#/features/payment-accounts/server/payment-accounts-repository'
import { createPaymentAccountSchema } from '#/features/payment-accounts/schemas/payment-account'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'
import { parseJsonBody } from '#/lib/server/request-body'

export const Route = createFileRoute('/api/payment-accounts')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse
        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext
        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const rows = await getUserPaymentAccounts(userContext.id)
        return Response.json({ success: true, data: rows })
      },
      POST: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
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

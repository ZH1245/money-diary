import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { updateUserCurrency } from '#/features/settings/server/settings-repository'
import { SUPPORTED_CURRENCIES } from '#/lib/currency'
import {
  buildOptionsResponse,
  guardApiRequest,
  rejectClientSuppliedUserId,
  requireUserContext,
} from '#/lib/server/api-guards'

const supportedCurrencyCodes = SUPPORTED_CURRENCIES.map((currency) => currency.code) as readonly string[]

const updateCurrencySchema = z.object({
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => supportedCurrencyCodes.includes(value), 'Unsupported currency'),
})

export const Route = createFileRoute('/api/settings/currency')({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await request.json().catch(() => null)
        const userIdRejected = rejectClientSuppliedUserId(
          request,
          body && typeof body === 'object' ? (body as Record<string, unknown>) : null,
        )
        if (userIdRejected) return userIdRejected

        const parsed = updateCurrencySchema.safeParse(body)

        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid currency payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const updatedUser = await updateUserCurrency({
          userId: userContext.id,
          currency: parsed.data.currency,
        })

        return Response.json({ success: true, data: updatedUser })
      },
      OPTIONS: ({ request }) => {
        return buildOptionsResponse(request)
      },
    },
  },
})

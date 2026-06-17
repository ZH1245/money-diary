import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { updateUserCurrency } from '#/features/settings/server/settings-repository'
import { SUPPORTED_CURRENCIES } from '#/lib/currency'
import {
  buildOptionsResponse,
  guardApiRequest,
  requireUserContext,
  resolveTargetUserId,
} from '#/lib/server/api-guards'

const supportedCurrencyCodes = SUPPORTED_CURRENCIES.map((currency) => currency.code) as readonly string[]

const updateCurrencySchema = z.object({
  userId: z.string().trim().min(1).optional(),
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
        const blockedResponse = guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const body = await request.json().catch(() => null)
        const parsed = updateCurrencySchema.safeParse(body)

        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid currency payload', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const targetUserId = resolveTargetUserId({
          requester: userContext,
          requestedUserId: parsed.data.userId,
        })

        const updatedUser = await updateUserCurrency({
          userId: targetUserId,
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

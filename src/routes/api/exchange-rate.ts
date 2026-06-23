import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { fetchExchangeRate } from '#/features/exchange-rates/server/fetch-exchange-rate'
import { buildOptionsResponse, guardApiRequest, rejectClientSuppliedUserId, requireUserContext } from '#/lib/server/api-guards'
import { SUPPORTED_CURRENCIES } from '#/lib/currency'

const supportedCurrencyCodes = SUPPORTED_CURRENCIES.map((currency) => currency.code) as readonly string[]

const exchangeRateQuerySchema = z.object({
  from: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value.length === 3 && supportedCurrencyCodes.includes(value), 'Unsupported source currency'),
  to: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value.length === 3 && supportedCurrencyCodes.includes(value), 'Unsupported target currency'),
})

export const Route = createFileRoute('/api/exchange-rate')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = await guardApiRequest(request)
        if (blockedResponse) return blockedResponse

        const userContext = await requireUserContext(request)
        if (userContext instanceof Response) return userContext

        const userIdRejected = rejectClientSuppliedUserId(request)
        if (userIdRejected) return userIdRejected

        const query = Object.fromEntries(new URL(request.url).searchParams.entries())
        const parsed = exchangeRateQuerySchema.safeParse(query)

        if (!parsed.success) {
          return Response.json(
            { success: false, error: 'Invalid exchange rate query', details: parsed.error.flatten() },
            { status: 400 },
          )
        }

        try {
          const result = await fetchExchangeRate(parsed.data.from, parsed.data.to)
          return Response.json({
            success: true,
            data: {
              from: parsed.data.from,
              to: parsed.data.to,
              rate: result.rate,
              date: result.date,
            },
          })
        } catch (error) {
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unable to fetch exchange rate',
            },
            { status: 502 },
          )
        }
      },
      OPTIONS: ({ request }) => buildOptionsResponse(request),
    },
  },
})

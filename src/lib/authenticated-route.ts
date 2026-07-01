import { createServerFn } from '@tanstack/react-start'
import type { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '#/features/query-keys'
import { runAuthenticatedRouteRequest } from '#/lib/server/authenticated-route'
import type { AuthenticatedRouteRequestResult } from '#/lib/server/authenticated-route'
import type { SessionUser } from '#/types/auth'

export type RoutePrefetchKey =
  | 'dashboard'
  | 'transactions'
  | 'savings'
  | 'wishlist'
  | 'goals'
  | 'accounts'
  | 'categories'
  | 'analytics'
  | 'settings'
  | 'admin'

export interface AuthenticatedRouteLoaderData {
  user: SessionUser
  userId: string
}

const loadAuthenticatedRouteInputSchema = z.object({
  prefetchKey: z.enum([
    'dashboard',
    'transactions',
    'savings',
    'wishlist',
    'goals',
    'accounts',
    'categories',
    'analytics',
    'settings',
    'admin',
  ]),
  requireAdmin: z.boolean().optional(),
})

const loadAuthenticatedRoute = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .validator(loadAuthenticatedRouteInputSchema)
  .handler(async ({ data }) => runAuthenticatedRouteRequest(data))

const ROUTE_QUERY_SLOT_KEYS = {
  transactions: queryKeys.transactions.all,
  categories: queryKeys.categories.all,
  savings: queryKeys.savings.all,
  paymentAccounts: queryKeys.paymentAccounts.all,
  wishlist: queryKeys.wishlist.all,
  goals: queryKeys.goals.all,
  recurring: queryKeys.recurring.all,
  drafts: queryKeys.transactions.drafts,
  tickets: queryKeys.tickets.all,
  adminBans: queryKeys.admin.bans,
  adminTickets: queryKeys.admin.tickets,
} as const

/** Matches API JSON shape so Date fields become ISO strings (same as fetch responses). */
function toJsonApiShape<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** Authenticates via cookies, fetches route data on the server, seeds the query cache. */
export async function runAuthenticatedRouteLoader(
  queryClient: QueryClient,
  prefetchKey: RoutePrefetchKey,
  options?: { requireAdmin?: boolean },
): Promise<AuthenticatedRouteLoaderData> {
  const result = (await loadAuthenticatedRoute({
    data: {
      prefetchKey,
      requireAdmin: options?.requireAdmin,
    },
  })) as AuthenticatedRouteRequestResult

  for (const seed of result.queries) {
    queryClient.setQueryData(
      ROUTE_QUERY_SLOT_KEYS[seed.slot],
      toJsonApiShape(seed.data),
    )
  }

  return {
    user: result.user,
    userId: result.userId,
  }
}

/** TanStack Router loader factory for authenticated routes. */
export function createAuthenticatedRouteLoader(
  prefetchKey: RoutePrefetchKey,
  options?: { requireAdmin?: boolean },
) {
  return async ({
    context,
  }: {
    context: { queryClient: QueryClient }
  }): Promise<AuthenticatedRouteLoaderData> =>
    runAuthenticatedRouteLoader(context.queryClient, prefetchKey, options)
}

import '@tanstack/react-start/server-only'
import { getRequest } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { listBans } from '#/features/admin/server/admin-bans-repository'
import { getVisibleCategoriesForUser } from '#/features/categories/server/categories-repository'
import { getAllTicketsForAdmin, getUserTickets } from '#/features/feedback/server/tickets-repository'
import { getUserGoals } from '#/features/goals/server/goals-repository'
import { getUserPaymentAccounts } from '#/features/payment-accounts/server/payment-accounts-repository'
import { getUserRecurringRules } from '#/features/recurring/server/recurring-repository'
import { getUserSavings } from '#/features/savings/server/savings-repository'
import { getUserDraftTransactions, getUserTransactions } from '#/features/transactions/server/transactions-repository'
import { getUserWishlistItems } from '#/features/wishlist/server/wishlist-repository'
import { auth } from '#/lib/auth'
import { AUTH_ROLES } from '#/lib/auth-roles'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import type { SessionUser } from '#/types/auth'

type RoutePrefetchKey =
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

interface ServerUserContext {
  id: string
  name: string
  email: string
  image: string | null
  currency: string
  role: string
}

type RouteQuerySlot =
  | 'transactions'
  | 'categories'
  | 'savings'
  | 'paymentAccounts'
  | 'wishlist'
  | 'goals'
  | 'recurring'
  | 'drafts'
  | 'tickets'
  | 'adminBans'
  | 'adminTickets'

interface RouteQuerySeed {
  slot: RouteQuerySlot
  data: unknown
}

export interface AuthenticatedRouteRequestResult {
  user: SessionUser
  userId: string
  queries: RouteQuerySeed[]
}

/** Resolves the signed-in user from request cookies. */
async function resolveServerUser(): Promise<ServerUserContext | null> {
  const request = getRequest()
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const user = session?.user
  if (!user?.id) {
    return null
  }

  const role = (user as { role?: string }).role ?? AUTH_ROLES.user
  const accountStatus = (user as { accountStatus?: string }).accountStatus ?? 'active'
  if (role !== AUTH_ROLES.admin && accountStatus !== 'active') {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    currency: ((user as { currency?: string }).currency ?? DEFAULT_CURRENCY).toUpperCase(),
    role,
  }
}

function toSessionUser(user: ServerUserContext): SessionUser {
  return {
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    currency: user.currency,
  }
}

async function fetchRouteQueryData(
  routeKey: RoutePrefetchKey,
  userId: string,
): Promise<RouteQuerySeed[]> {
  switch (routeKey) {
    case 'dashboard': {
      const [
        transactions,
        categories,
        savings,
        paymentAccounts,
        wishlist,
        goals,
        recurring,
        drafts,
      ] = await Promise.all([
        getUserTransactions(userId),
        getVisibleCategoriesForUser(userId),
        getUserSavings(userId),
        getUserPaymentAccounts(userId),
        getUserWishlistItems(userId),
        getUserGoals(userId),
        getUserRecurringRules(userId),
        getUserDraftTransactions(userId),
      ])
      return [
        { slot: 'transactions', data: transactions },
        { slot: 'categories', data: categories },
        { slot: 'savings', data: savings },
        { slot: 'paymentAccounts', data: paymentAccounts },
        { slot: 'wishlist', data: wishlist },
        { slot: 'goals', data: goals },
        { slot: 'recurring', data: recurring },
        { slot: 'drafts', data: drafts },
      ]
    }
    case 'transactions': {
      const [transactions, categories, paymentAccounts] = await Promise.all([
        getUserTransactions(userId),
        getVisibleCategoriesForUser(userId),
        getUserPaymentAccounts(userId),
      ])
      return [
        { slot: 'transactions', data: transactions },
        { slot: 'categories', data: categories },
        { slot: 'paymentAccounts', data: paymentAccounts },
      ]
    }
    case 'savings': {
      const [savings, goals, paymentAccounts] = await Promise.all([
        getUserSavings(userId),
        getUserGoals(userId),
        getUserPaymentAccounts(userId),
      ])
      return [
        { slot: 'savings', data: savings },
        { slot: 'goals', data: goals },
        { slot: 'paymentAccounts', data: paymentAccounts },
      ]
    }
    case 'wishlist': {
      const wishlist = await getUserWishlistItems(userId)
      return [{ slot: 'wishlist', data: wishlist }]
    }
    case 'goals': {
      const [goals, savings] = await Promise.all([
        getUserGoals(userId),
        getUserSavings(userId),
      ])
      return [
        { slot: 'goals', data: goals },
        { slot: 'savings', data: savings },
      ]
    }
    case 'accounts': {
      const [paymentAccounts, transactions, savings] = await Promise.all([
        getUserPaymentAccounts(userId),
        getUserTransactions(userId),
        getUserSavings(userId),
      ])
      return [
        { slot: 'paymentAccounts', data: paymentAccounts },
        { slot: 'transactions', data: transactions },
        { slot: 'savings', data: savings },
      ]
    }
    case 'categories': {
      const categories = await getVisibleCategoriesForUser(userId)
      return [{ slot: 'categories', data: categories }]
    }
    case 'analytics': {
      const [transactions, categories, paymentAccounts, savings] = await Promise.all([
        getUserTransactions(userId),
        getVisibleCategoriesForUser(userId),
        getUserPaymentAccounts(userId),
        getUserSavings(userId),
      ])
      return [
        { slot: 'transactions', data: transactions },
        { slot: 'categories', data: categories },
        { slot: 'paymentAccounts', data: paymentAccounts },
        { slot: 'savings', data: savings },
      ]
    }
    case 'settings': {
      const tickets = await getUserTickets(userId)
      return [{ slot: 'tickets', data: tickets }]
    }
    case 'admin': {
      const [bans, tickets] = await Promise.all([
        listBans(),
        getAllTicketsForAdmin(),
      ])
      return [
        { slot: 'adminBans', data: bans },
        { slot: 'adminTickets', data: tickets },
      ]
    }
    default: {
      const exhaustive: never = routeKey
      return exhaustive
    }
  }
}

/** Cookie auth + DB reads for route loaders (called from createServerFn). */
export async function runAuthenticatedRouteRequest(input: {
  prefetchKey: RoutePrefetchKey
  requireAdmin?: boolean
}): Promise<AuthenticatedRouteRequestResult> {
  const user = await resolveServerUser()
  if (!user) {
    throw redirect({ to: '/sign-in' })
  }

  if (input.requireAdmin && user.role !== AUTH_ROLES.admin) {
    throw redirect({ to: '/dashboard' })
  }

  const queries = await fetchRouteQueryData(input.prefetchKey, user.id)

  return {
    user: toSessionUser(user),
    userId: user.id,
    queries,
  }
}

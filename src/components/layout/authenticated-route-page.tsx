import { Navigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import type { AuthenticatedRouteLoaderData } from '#/lib/authenticated-route'
import { AUTH_ROLES } from '#/lib/auth-roles'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { useAuthSession } from '#/lib/use-auth-session'
import { toSessionUser, type SessionUser } from '#/types/auth'

export interface AuthenticatedRoutePageContext {
  user: SessionUser
  userId: string
  userCurrency: string
}

interface AuthenticatedRoutePageProps {
  loaderData: AuthenticatedRouteLoaderData | undefined
  requireAdmin?: boolean
  children: (context: AuthenticatedRoutePageContext) => ReactNode
}

/**
 * Renders an authenticated shell using server-resolved user when available.
 * Client session is used for display and reactive updates only.
 */
export function AuthenticatedRoutePage({
  loaderData,
  requireAdmin = false,
  children,
}: AuthenticatedRoutePageProps) {
  const { data: session, isInitialPending } = useAuthSession()

  const shellUser =
    loaderData?.user ??
    (session?.user ? toSessionUser(session.user) : null)

  const userId = loaderData?.userId ?? session?.user?.id ?? null

  if (!shellUser && isInitialPending) {
    return <SessionLoadingSkeleton />
  }

  if (!shellUser || !userId) {
    return <Navigate to="/sign-in" />
  }

  if (requireAdmin && shellUser.role !== AUTH_ROLES.admin) {
    return <Navigate to="/dashboard" />
  }

  const userCurrency = (
    shellUser.currency ?? DEFAULT_CURRENCY
  ).toUpperCase()

  return (
    <AuthenticatedAppShell user={shellUser}>
      {children({ user: shellUser, userId, userCurrency })}
    </AuthenticatedAppShell>
  )
}

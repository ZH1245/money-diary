import { SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { GoalsPageContent } from '#/features/goals/components/goals-page-content'
import { useAuthSession } from '#/lib/use-auth-session'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { toSessionUser } from '#/types/auth'
import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/goals')({
  component: GoalsPage,
})

function GoalsPage() {
  const { data: session, isInitialPending: isSessionPending } = useAuthSession()

  if (isSessionPending) {
    return <SessionLoadingSkeleton />
  }

  if (!session?.user) {
    return <Navigate to="/sign-in" />
  }

  const userCurrency = (session.user as { currency?: string }).currency ?? DEFAULT_CURRENCY

  return (
    <AuthenticatedAppShell user={toSessionUser(session.user)}>
      <GoalsPageContent userCurrency={userCurrency.toUpperCase()} />
    </AuthenticatedAppShell>
  )
}

import { SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { TransactionsPageContent } from '#/features/transactions/components/transactions-page-content'
import { useAuthSession } from '#/lib/use-auth-session'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { toSessionUser } from '#/types/auth'
import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/transactions')({
  component: TransactionsPage,
})

function TransactionsPage() {
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
      <TransactionsPageContent userCurrency={userCurrency.toUpperCase()} />
    </AuthenticatedAppShell>
  )
}

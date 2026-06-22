import { SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { CategoriesPageContent } from '#/features/categories/components/categories-page-content'
import { useAuthSession } from '#/lib/use-auth-session'
import { toSessionUser } from '#/types/auth'
import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
})

function CategoriesPage() {
  const { data: session, isInitialPending: isSessionPending } = useAuthSession()

  if (isSessionPending) {
    return <SessionLoadingSkeleton />
  }

  if (!session?.user) {
    return <Navigate to="/sign-in" />
  }

  return (
    <AuthenticatedAppShell user={toSessionUser(session.user)}>
      <CategoriesPageContent userId={session.user.id} />
    </AuthenticatedAppShell>
  )
}

import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { AdminGlobalAiSection } from '#/features/admin/components/admin-global-ai-section'
import { AdminGlobalCategoriesSection } from '#/features/admin/components/admin-global-categories-section'
import { AdminUsersSection } from '#/features/admin/components/admin-users-section'
import { AUTH_ROLES } from '#/lib/auth-roles'
import { useAuthSession } from '#/lib/use-auth-session'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  const { data: session, isInitialPending } = useAuthSession()

  if (isInitialPending) {
    return <SessionLoadingSkeleton />
  }

  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== AUTH_ROLES.admin) {
    return (
      <main className="page-wrap py-6">
        <section className="island-shell rounded-2xl p-6">
          <h1 className="display-title text-2xl">Forbidden</h1>
          <p className="mt-2 text-sm opacity-80">Admin access is required to manage global settings.</p>
        </section>
      </main>
    )
  }

  return (
    <AuthenticatedAppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role,
        currency: (session.user as { currency?: string }).currency,
      }}
    >
      <main className="p-6 md:p-8">
        <section className="space-y-6">
          <div className="island-shell rounded-2xl p-6">
            <h1 className="display-title text-3xl">Global settings</h1>
            <p className="mt-2 text-sm opacity-80">
              Configure shared resources for all users. Your personal transactions, savings, goals, and
              settings are unchanged — use Dashboard and the rest of the app for your own finances.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminGlobalAiSection />
            <AdminGlobalCategoriesSection />
            <AdminUsersSection />
          </div>
        </section>
      </main>
    </AuthenticatedAppShell>
  )
}

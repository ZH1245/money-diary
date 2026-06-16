import { authClient } from '#/lib/auth-client'
import { Link, Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="p-8">
        <p>Loading session...</p>
      </div>
    )
  }

  if (!session?.user) {
    return <Navigate to="/sign-in" />
  }

  return (
    <main className="page-wrap py-10">
      <section className="island-shell rounded-2xl p-6">
        <h1 className="display-title text-3xl">Money Diary</h1>
        <p className="mt-3 text-base opacity-80">
          API foundation is ready. Next step is building feature pages on top.
        </p>

        <div className="mt-6 space-y-2">
          <p className="text-sm">Signed in as <strong>{session.user.email}</strong></p>
          <p className="text-sm opacity-80">Role: {(session.user as { role?: string }).role ?? 'user'}</p>
        </div>
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/transactions"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Open transactions
            </Link>
            <Link
              to="/swagger"
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium"
            >
              Open API docs
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

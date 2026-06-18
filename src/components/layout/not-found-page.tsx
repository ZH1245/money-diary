import { SiteFooter } from '#/components/layout/site-footer'
import { ThemeToggle } from '#/components/layout/theme-toggle'
import { Button } from '#/components/ui/button'
import { useAuthSession } from '#/lib/use-auth-session'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CircleDollarSign, Home, LogIn } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Full-page 404 for unknown routes with session-aware navigation.
 */
export function NotFoundPage() {
  const navigate = useNavigate()
  const { data: session, isInitialPending } = useAuthSession()
  const isSignedIn = Boolean(session?.user)
  const homeTo = isSignedIn ? '/' : '/sign-in'
  const homeLabel = isSignedIn ? 'Go to dashboard' : 'Sign in'

  useEffect(() => {
    document.title = 'Page not found | Money Diary'
  }, [])

  function handleGoBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
      return
    }

    void navigate({ to: homeTo })
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-(--bg-base)">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 size-72 rounded-full bg-(--hero-a) blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-24 size-80 rounded-full bg-(--hero-b) blur-3xl"
      />

      <header className="relative z-10 border-b border-(--line) bg-(--header-bg)/90 px-5 py-4 backdrop-blur md:px-8">
        <div className="page-wrap flex items-center justify-between gap-4">
          <Link to={homeTo} className="flex items-center gap-2.5 text-sm font-semibold no-underline">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <CircleDollarSign className="size-4" />
            </span>
            <span>Money Diary</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-12 md:px-8">
        <section className="island-shell rise-in w-full max-w-lg rounded-3xl p-8 text-center md:p-10">
          <p className="island-kicker">Lost in the ledger</p>
          <p
            aria-hidden
            className="mt-4 bg-linear-to-br from-primary/80 to-primary/30 bg-clip-text text-7xl font-extrabold tracking-tighter text-transparent md:text-8xl"
          >
            404
          </p>
          <h1 className="display-title mt-3 text-2xl font-semibold md:text-3xl">Page not found</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed opacity-80">
            This URL does not match anything in your Money Diary workspace. The page may have moved or
            the link could be mistyped.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" disabled={isInitialPending} className="min-w-[11rem]">
              <Link to={homeTo}>
                {isSignedIn ? <Home /> : <LogIn />}
                {isInitialPending ? 'Loading...' : homeLabel}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-w-[11rem]"
              onClick={handleGoBack}
            >
              <ArrowLeft />
              Go back
            </Button>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  )
}

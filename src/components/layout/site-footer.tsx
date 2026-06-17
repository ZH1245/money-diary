import { authClient } from '#/lib/auth-client'
import { Link } from '@tanstack/react-router'

interface SiteFooterProps {
  showAuthLinks?: boolean
}

/**
 * Shared public footer with legal links and optional auth shortcuts.
 */
export function SiteFooter({ showAuthLinks = true }: SiteFooterProps) {
  const { data: session } = authClient.useSession()
  const isSignedIn = Boolean(session?.user)

  return (
    <footer className="site-footer mt-auto px-5 py-6 md:px-8">
      <div className="page-wrap flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm opacity-80">© {new Date().getFullYear()} Money Diary</p>
        <nav
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm opacity-80"
          aria-label="Site footer"
        >
          <Link to="/privacy" className="underline underline-offset-4 hover:opacity-100">
            Privacy
          </Link>
          <Link to="/terms" className="underline underline-offset-4 hover:opacity-100">
            Terms
          </Link>
          {showAuthLinks && isSignedIn ? (
            <Link to="/" className="underline underline-offset-4 hover:opacity-100">
              Dashboard
            </Link>
          ) : null}
          {showAuthLinks && !isSignedIn ? (
            <>
              <Link to="/sign-in" className="underline underline-offset-4 hover:opacity-100">
                Sign in
              </Link>
              <Link to="/sign-up" className="underline underline-offset-4 hover:opacity-100">
                Sign up
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </footer>
  )
}

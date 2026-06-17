import { ThemeToggle } from '#/components/layout/theme-toggle'
import { SiteFooter } from '#/components/layout/site-footer'
import { useNavigate } from '@tanstack/react-router'

interface LegalPageLayoutProps {
  title: string
  lastUpdated: string
  backTo: string
  backLabel: string
  children: React.ReactNode
}

/**
 * Public layout for legal documents such as the privacy policy.
 */
export function LegalPageLayout({
  title,
  lastUpdated,
  backTo,
  backLabel,
  children,
}: LegalPageLayoutProps) {
  const navigate = useNavigate()
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1

  function handleBackClick() {
    if (canGoBack) {
      window.history.back()
      return
    }

    void navigate({ to: backTo })
  }

  return (
    <main className="min-h-screen bg-(--bg-base)">
      <header className="site-footer px-5 py-4 md:px-8">
        <div className="page-wrap flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBackClick}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            ← {canGoBack ? 'Back to previous page' : backLabel}
          </button>
          <div className="flex items-center gap-3">
            <p className="island-kicker text-xs">Money Diary</p>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="page-wrap py-8 md:py-12">
        <article className="island-shell mx-auto max-w-3xl rounded-2xl p-6 md:p-10 rise-in">
          <p className="island-kicker">Legal</p>
          <h1 className="display-title mt-2 text-3xl md:text-4xl">{title}</h1>
          <p className="mt-3 text-xs uppercase tracking-[0.14em] opacity-60">
            Last updated {lastUpdated}
          </p>
          <div className="mt-8 space-y-8 text-sm leading-relaxed opacity-90">{children}</div>
        </article>
      </div>

      <SiteFooter />
    </main>
  )
}

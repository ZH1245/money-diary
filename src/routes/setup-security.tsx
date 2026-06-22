import { SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { AuthFeaturePanel } from '#/components/layout/auth-feature-panel'
import { AuthSplitLayout } from '#/components/layout/auth-split-layout'
import { ThemeToggle } from '#/components/layout/theme-toggle'
import { SecuritySetupForm } from '#/features/auth/components/security-setup-form'
import { useSecurityProfile } from '#/features/auth/hooks/use-security-profile'
import { useAuthSession } from '#/lib/use-auth-session'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import { MessageSquare, ShieldCheck, Sparkles } from 'lucide-react'

export const Route = createFileRoute('/setup-security')({
  component: SetupSecurityPage,
})

function SetupSecurityPage() {
  const { data: session, isInitialPending } = useAuthSession()
  const { data: profile, isLoading: isProfileLoading } = useSecurityProfile(Boolean(session?.user))

  if (isInitialPending) {
    return <SessionLoadingSkeleton />
  }

  if (!session?.user) {
    return <Navigate to="/sign-in" />
  }

  if (isProfileLoading) {
    return <SessionLoadingSkeleton />
  }

  if (profile) {
    return <Navigate to="/" />
  }

  return (
    <AuthSplitLayout
      formPanel={
        <article className="island-shell rise-in w-full max-w-md rounded-2xl p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">Step 2 of 2</p>
              <h2 className="display-title text-3xl">Secure your account</h2>
            </div>
            <ThemeToggle />
          </div>
          <p className="mt-2 text-sm opacity-80">
            Your account is ready. Add recovery details before you start tracking money.
          </p>

          <SecuritySetupForm />
        </article>
      }
      featurePanel={
        <AuthFeaturePanel
          kicker="Almost done"
          title="Secure first. Then talk to your diary."
          description="Recovery answers protect your account. Right after this step, AI helps you log and understand your money in plain language."
          tags={['One-time setup', 'Hashed answers', 'AI ready next']}
          gradientDirection="br"
          features={[
            {
              icon: ShieldCheck,
              title: 'Password protection',
              description: 'Your security answer is required when you update your password in Settings.',
            },
            {
              icon: MessageSquare,
              title: 'AI chat waiting for you',
              description: 'Log “Groceries 2,500” or ask “How much went to subscriptions?” once you are in.',
            },
            {
              icon: Sparkles,
              title: 'Finish setup once',
              description: 'Complete recovery now, then manage money with chat and dashboards.',
            },
          ]}
        />
      }
    />
  )
}

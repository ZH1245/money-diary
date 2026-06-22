import { authClient } from '#/lib/auth-client'
import { InlineError } from '#/components/feedback/inline-error'
import { FormField } from '#/components/forms/form-field'
import { AuthFeaturePanel } from '#/components/layout/auth-feature-panel'
import { AuthSplitLayout } from '#/components/layout/auth-split-layout'
import { ThemeToggle } from '#/components/layout/theme-toggle'
import { AuthenticatedEntryRedirect } from '#/features/auth/components/authenticated-entry-redirect'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart3, Loader2, MessageSquare, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

function SignInPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (session?.user) {
    return <AuthenticatedEntryRedirect />
  }

  function getFieldError(field: 'email' | 'password', value: string): string {
    const schema = signInSchema.shape[field]
    const parsed = schema.safeParse(value)
    if (parsed.success) return ''
    return parsed.error.issues[0]?.message ?? 'Invalid value'
  }

  function handleEmailChange(nextValue: string) {
    setEmail(nextValue)
    setErrorMessage(null)
    setFieldErrors((previous) => ({
      ...previous,
      email: getFieldError('email', nextValue),
    }))
  }

  function handlePasswordChange(nextValue: string) {
    setPassword(nextValue)
    setErrorMessage(null)
    setFieldErrors((previous) => ({
      ...previous,
      password: getFieldError('password', nextValue),
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setFieldErrors({})

    const parsed = signInSchema.safeParse({ email, password })

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}

      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !nextErrors[key]) {
          nextErrors[key] = issue.message
        }
      }

      setFieldErrors(nextErrors)
      return
    }

    setIsSubmitting(true)

    const requestPromise = authClient.signIn.email({
      email,
      password,
    })
    const submitPromise = requestPromise.then((result) => {
      if (result.error) throw new Error(result.error.message ?? 'Unable to sign in')
      return result
    })

    toast.promise(submitPromise, {
      loading: 'Signing in...',
      success: 'Signed in successfully',
      error: 'Unable to sign in',
    })

    const result = await requestPromise

    setIsSubmitting(false)

    if (result.error) {
      setErrorMessage(result.error.message ?? 'Unable to sign in')
      return
    }

    await navigate({ to: '/' })
  }

  return (
    <AuthSplitLayout
      featurePanel={
        <AuthFeaturePanel
          kicker="Money Diary AI"
          title="Your AI finance copilot awaits."
          description="Sign in to chat with your diary — log entries, review spending, and manage goals without the busywork."
          tags={['Natural language', 'Smart summaries', 'Secure workspace']}
          features={[
            {
              icon: MessageSquare,
              title: 'Chat to log money in or out',
              description: 'Tell AI what happened; it picks the account, category, and amount for you.',
            },
            {
              icon: BarChart3,
              title: 'Instant answers from your ledger',
              description: 'Ask for monthly totals, category breakdowns, or date-wise spending — no spreadsheet required.',
            },
            {
              icon: Sparkles,
              title: 'Update goals and wishlist by voice of text',
              description: 'Adjust targets, add wishlist items, or record savings through conversation.',
            },
          ]}
        />
      }
      formPanel={
        <article className="island-shell rise-in w-full max-w-md rounded-2xl p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="display-title text-3xl">Sign in</h2>
            <ThemeToggle />
          </div>
          <p className="mt-2 text-sm opacity-80">Access your account to continue.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <FormField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="you@example.com"
              error={fieldErrors.email}
              isDisabled={isSubmitting}
            />
            <FormField
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="At least 8 characters"
              error={fieldErrors.password}
              isDisabled={isSubmitting}
            />

            <p className="text-right text-sm">
              <Link to="/forgot-password" className="font-medium underline underline-offset-4">
                Forgot password?
              </Link>
            </p>

            {errorMessage ? <InlineError message={errorMessage} /> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm opacity-80">
            New here?{' '}
            <Link to="/sign-up" className="font-medium underline underline-offset-4">
              Create an account
            </Link>
          </p>

          <p className="mt-4 text-center text-xs opacity-70">
            <Link to="/terms" className="underline underline-offset-4">
              Terms of Service
            </Link>
            {' · '}
            <Link to="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
          </p>
        </article>
      }
    />
  )
}

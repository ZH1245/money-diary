import { authClient } from '#/lib/auth-client'
import { InlineError } from '#/components/feedback/inline-error'
import { SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { FormField } from '#/components/forms/form-field'
import { AuthFeaturePanel } from '#/components/layout/auth-feature-panel'
import { AuthSplitLayout } from '#/components/layout/auth-split-layout'
import { ThemeToggle } from '#/components/layout/theme-toggle'
import { Link, Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Clock3, FileText, Loader2 } from 'lucide-react'
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
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isSessionPending) {
    return <SessionLoadingSkeleton />
  }

  if (session?.user) {
    return <Navigate to="/" />
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
          kicker="Money Diary"
          title="Financial focus, simplified."
          description="Sign in to view spending, savings, wishlist, and goals in one place."
          tags={['Secure auth', 'Private by default', 'AI assisted entries']}
          features={[
            {
              icon: CheckCircle2,
              title: 'Log with ease',
              description: 'Record transactions quickly and keep every entry organized.',
            },
            {
              icon: Clock3,
              title: 'Track daily progress',
              description: 'Monitor savings flow and goal progress in one workspace.',
            },
            {
              icon: FileText,
              title: 'Understand spending',
              description: 'Use account-linked analytics to spot patterns over time.',
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

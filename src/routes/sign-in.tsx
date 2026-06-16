import { authClient } from '#/lib/auth-client'
import { InlineError } from '#/components/feedback/inline-error'
import { FormField } from '#/components/forms/form-field'
import { AuthSplitLayout } from '#/components/layout/auth-split-layout'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    toast.promise(requestPromise, {
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
        <>
          <div className="absolute inset-0 bg-linear-to-br from-(--hero-a) via-transparent to-(--hero-b)" />
          <div className="relative flex h-full flex-col p-12 xl:p-16 rise-in">
            <p className="island-kicker">Money Diary</p>
            <h1 className="display-title mt-4 max-w-2xl text-5xl leading-tight xl:text-6xl">
              Financial focus, in one calm workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base opacity-85">
              Sign in to monitor spending patterns, protect savings flow, and stay aligned with what matters.
            </p>
            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4">
              <div className="feature-card rounded-2xl border border-border/70 p-4 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] opacity-70">Savings</p>
                <p className="mt-2 text-2xl font-semibold">Live balance</p>
              </div>
              <div className="feature-card rounded-2xl border border-border/70 p-4 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] opacity-70">Spending</p>
                <p className="mt-2 text-2xl font-semibold">Top categories</p>
              </div>
              <div className="feature-card rounded-2xl border border-border/70 p-4 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] opacity-70">Planning</p>
                <p className="mt-2 text-2xl font-semibold">Wishlist vs goals</p>
              </div>
              <div className="feature-card rounded-2xl border border-border/70 p-4 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] opacity-70">Insights</p>
                <p className="mt-2 text-2xl font-semibold">Monthly trends</p>
              </div>
            </div>
          </div>
        </>
      }
      formPanel={
        <article className="island-shell rise-in w-full max-w-md rounded-2xl p-6 sm:p-7">
          <h2 className="display-title text-3xl">Sign in</h2>
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

          <p className="mt-5 text-sm opacity-80">
            New here?{' '}
            <Link to="/sign-up" className="font-medium underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </article>
      }
    />
  )
}

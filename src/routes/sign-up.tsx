import { authClient } from '#/lib/auth-client'
import { InlineError } from '#/components/feedback/inline-error'
import { FormField } from '#/components/forms/form-field'
import { AuthSplitLayout } from '#/components/layout/auth-split-layout'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '#/lib/currency'
import { Link, Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/sign-up')({
  component: SignUpPage,
})

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  currency: z.string().trim().length(3, 'Select a valid currency'),
})

function SignUpPage() {
  const navigate = useNavigate()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isSessionPending) {
    return (
      <main className="p-8">
        <p>Loading session...</p>
      </main>
    )
  }

  if (session?.user) {
    return <Navigate to="/" />
  }

  function getFieldError(field: 'name' | 'email' | 'password' | 'currency', value: string): string {
    const schema = signUpSchema.shape[field]
    const parsed = schema.safeParse(value)
    if (parsed.success) return ''
    return parsed.error.issues[0]?.message ?? 'Invalid value'
  }

  function handleNameChange(nextValue: string) {
    setName(nextValue)
    setErrorMessage(null)
    setFieldErrors((previous) => ({
      ...previous,
      name: getFieldError('name', nextValue),
    }))
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

  function handleCurrencyChange(nextValue: string) {
    setCurrency(nextValue)
    setErrorMessage(null)
    setFieldErrors((previous) => ({
      ...previous,
      currency: getFieldError('currency', nextValue),
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setFieldErrors({})

    const parsed = signUpSchema.safeParse({ name, email, password, currency })

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

    const requestPromise = authClient.signUp.email({
      name,
      email,
      password,
      currency,
    } as Parameters<typeof authClient.signUp.email>[0])
    const submitPromise = requestPromise.then((result) => {
      if (result.error) throw new Error(result.error.message ?? 'Unable to create account')
      return result
    })

    toast.promise(submitPromise, {
      loading: 'Creating account...',
      success: 'Account created successfully',
      error: 'Unable to create account',
    })

    const result = await requestPromise

    setIsSubmitting(false)

    if (result.error) {
      setErrorMessage(result.error.message ?? 'Unable to create account')
      return
    }

    await navigate({ to: '/' })
  }

  return (
    <AuthSplitLayout
      formPanel={
        <article className="island-shell rise-in w-full max-w-md rounded-2xl p-6 sm:p-7">
          <h2 className="display-title text-3xl">Create account</h2>
          <p className="mt-2 text-sm opacity-80">Start your money tracking workspace.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <FormField
              id="name"
              label="Name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Your full name"
              error={fieldErrors.name}
              isDisabled={isSubmitting}
            />
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
            <div>
              <label htmlFor="currency" className="mb-1 block text-sm font-medium">
                Preferred currency
              </label>
              <Select
                value={currency}
                onValueChange={handleCurrencyChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="currency" className="h-10 w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currencyOption) => (
                    <SelectItem key={currencyOption.code} value={currencyOption.code}>
                      {currencyOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.currency ? (
                <p className="mt-1 text-xs text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                  {fieldErrors.currency}
                </p>
              ) : null}
            </div>

            {errorMessage ? <InlineError message={errorMessage} /> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-5 text-sm opacity-80">
            Already have an account?{' '}
            <Link to="/sign-in" className="font-medium underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </article>
      }
      featurePanel={
        <>
          <div className="absolute inset-0 bg-linear-to-tr from-(--hero-b) via-transparent to-(--hero-a)" />
          <div className="relative flex h-full flex-col p-12 xl:p-16 rise-in">
            <p className="island-kicker">Money Diary</p>
            <h1 className="display-title mt-4 max-w-2xl text-5xl leading-tight xl:text-6xl">
              Build stronger financial habits from day one.
            </h1>
            <p className="mt-5 max-w-xl text-base opacity-85">
              Create your account to organize expenses, savings, wishlist items, and goals in one place.
            </p>
            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4">
              <div className="feature-card rounded-2xl border border-border/70 p-4 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] opacity-70">Control</p>
                <p className="mt-2 text-2xl font-semibold">Expense clarity</p>
              </div>
              <div className="feature-card rounded-2xl border border-border/70 p-4 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] opacity-70">Focus</p>
                <p className="mt-2 text-2xl font-semibold">Savings growth</p>
              </div>
              <div className="feature-card rounded-2xl border border-border/70 p-4 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] opacity-70">Planning</p>
                <p className="mt-2 text-2xl font-semibold">Goal tracking</p>
              </div>
              <div className="feature-card rounded-2xl border border-border/70 p-4 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.16em] opacity-70">Insights</p>
                <p className="mt-2 text-2xl font-semibold">Category signals</p>
              </div>
            </div>
          </div>
        </>
      }
    />
  )
}

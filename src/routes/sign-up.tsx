import { authClient } from '#/lib/auth-client'
import { InlineError } from '#/components/feedback/inline-error'
import { FormField } from '#/components/forms/form-field'
import { AuthFeaturePanel } from '#/components/layout/auth-feature-panel'
import { AuthSplitLayout } from '#/components/layout/auth-split-layout'
import { ThemeToggle } from '#/components/layout/theme-toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '#/lib/currency'
import { AuthenticatedEntryRedirect } from '#/features/auth/components/authenticated-entry-redirect'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart3, Loader2, MessageSquare, Sparkles } from 'lucide-react'
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
  acceptsLegal: z.boolean().refine((value) => value, {
    message: 'You must agree to the Terms and Privacy Policy',
  }),
})

function SignUpPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [acceptsLegal, setAcceptsLegal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (session?.user) {
    return <AuthenticatedEntryRedirect />
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



  function handleLegalChange(checked: boolean) {
    setAcceptsLegal(checked)
    setErrorMessage(null)
    setFieldErrors((previous) => ({
      ...previous,
      acceptsLegal: checked ? '' : 'You must agree to the Terms and Privacy Policy',
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setFieldErrors({})

    const parsed = signUpSchema.safeParse({
      name,
      email,
      password,
      currency,
      acceptsLegal,
    })

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

    await navigate({ to: '/setup-security' })
  }

  return (
    <AuthSplitLayout
      formPanel={
        <article className="island-shell rise-in w-full max-w-md rounded-2xl p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">Step 1 of 2</p>
              <h2 className="display-title text-3xl">Create account</h2>
            </div>
            <ThemeToggle />
          </div>
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
              autoComplete="new-password"
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

            <div>
              <label className="flex items-start gap-2 text-xs leading-relaxed opacity-90">
                <input
                  type="checkbox"
                  checked={acceptsLegal}
                  onChange={(event) => handleLegalChange(event.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 size-4 rounded border border-border"
                />
                <span>
                  I agree to the{' '}
                  <Link to="/terms" className="font-medium underline underline-offset-4">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="font-medium underline underline-offset-4">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {fieldErrors.acceptsLegal ? (
                <p className="mt-1 text-xs text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                  {fieldErrors.acceptsLegal}
                </p>
              ) : null}
            </div>

            {errorMessage ? <InlineError message={errorMessage} /> : null}

            <button
              type="submit"
              disabled={isSubmitting || !acceptsLegal}
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
        <AuthFeaturePanel
          kicker="Money Diary AI"
          title="Talk to your money diary."
          description="Log transactions in natural language, ask spending questions, and let AI create entries from a simple chat."
          tags={['Say it, log it', 'Ask your ledger', 'Private workspace']}
          gradientDirection="tr"
          features={[
            {
              icon: MessageSquare,
              title: 'Log in plain English',
              description: 'Type “Netflix 1,200” or “salary 80k” — AI adds the right transaction for you.',
            },
            {
              icon: BarChart3,
              title: 'Ask anything about your money',
              description: '“What did I spend on food this month?” or “Show my top categories” — answered from your data.',
            },
            {
              icon: Sparkles,
              title: 'Savings, goals, and wishlist too',
              description: 'Create savings entries, goals, and wishlist items without filling long forms.',
            },
          ]}
        />
      }
    />
  )
}

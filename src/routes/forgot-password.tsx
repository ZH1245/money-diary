import { authClient } from '#/lib/auth-client'
import { InlineError } from '#/components/feedback/inline-error'
import { FormField } from '#/components/forms/form-field'
import { AuthFeaturePanel } from '#/components/layout/auth-feature-panel'
import { AuthSplitLayout } from '#/components/layout/auth-split-layout'
import { ThemeToggle } from '#/components/layout/theme-toggle'
import { Link, Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Clock3, FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

const resetSchema = z.object({
  answerOne: z.string().trim().min(2, 'Answer is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm your password'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
})

interface RecoveryChallenge {
  available: boolean
  message?: string
  questionOneLabel?: string
  recoveryEmailHint?: string | null
}

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [email, setEmail] = useState('')
  const [challenge, setChallenge] = useState<RecoveryChallenge | null>(null)
  const [answerOne, setAnswerOne] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (session?.user) {
    return <Navigate to="/" />
  }

  async function handleChallengeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setFieldErrors({})

    const parsed = emailSchema.safeParse({ email })
    if (!parsed.success) {
      setFieldErrors({ email: parsed.error.issues[0]?.message ?? 'Invalid email' })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/recovery/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: parsed.data.email }),
      })

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: RecoveryChallenge
      } | null

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error ?? 'Unable to start password recovery')
      }

      setChallenge(payload.data)
      if (!payload.data.available) {
        setErrorMessage(payload.data.message ?? 'Recovery is not available for this email.')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start password recovery')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setFieldErrors({})

    const parsed = resetSchema.safeParse({
      answerOne,
      newPassword,
      confirmPassword,
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
    try {
      const response = await fetch('/api/auth/recovery/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          answerOne: parsed.data.answerOne,
          newPassword: parsed.data.newPassword,
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
      } | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to reset password')
      }

      toast.success('Password updated')
      await navigate({ to: '/sign-in' })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reset password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout
      featurePanel={
        <AuthFeaturePanel
          kicker="Money Diary"
          title="Recover your account."
          description="Answer your security question to set a new password. Email verification codes are coming in a later phase."
          tags={['Recovery email', 'Security question', 'Private recovery']}
          features={[
            {
              icon: CheckCircle2,
              title: 'Question-based reset',
              description: 'Use the answer you chose when setting up account recovery.',
            },
            {
              icon: Clock3,
              title: 'Rate limited',
              description: 'Recovery attempts are limited to reduce guessing attacks.',
            },
            {
              icon: FileText,
              title: 'Future OTP support',
              description: 'Recovery email verification will be added without changing your answers.',
            },
          ]}
        />
      }
      formPanel={
        <article className="island-shell rise-in w-full max-w-md rounded-2xl p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="display-title text-3xl">Reset password</h2>
            <ThemeToggle />
          </div>
          <p className="mt-2 text-sm opacity-80">
            {challenge?.available
              ? 'Answer your security question and choose a new password.'
              : 'Enter your account email to load your recovery question.'}
          </p>

          {!challenge?.available ? (
            <form className="mt-6 space-y-4" onSubmit={handleChallengeSubmit} noValidate>
              <FormField
                id="recovery-email"
                label="Account email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                error={fieldErrors.email}
                isDisabled={isSubmitting}
              />

              {errorMessage ? <InlineError message={errorMessage} /> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue
              </button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleResetSubmit} noValidate>
              <p className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs opacity-80">
                Account: {email}
                {challenge.recoveryEmailHint ? ` · Recovery email on file: ${challenge.recoveryEmailHint}` : null}
              </p>

              <FormField
                id="answer-one"
                label={challenge.questionOneLabel ?? 'Security answer'}
                type="password"
                value={answerOne}
                onChange={setAnswerOne}
                placeholder="Your answer"
                error={fieldErrors.answerOne}
                isDisabled={isSubmitting}
              />
              <FormField
                id="new-password"
                label="New password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="At least 8 characters"
                error={fieldErrors.newPassword}
                isDisabled={isSubmitting}
              />
              <FormField
                id="confirm-password"
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat new password"
                error={fieldErrors.confirmPassword}
                isDisabled={isSubmitting}
              />

              {errorMessage ? <InlineError message={errorMessage} /> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Reset password
              </button>
            </form>
          )}

          <p className="mt-5 text-sm opacity-80">
            <Link to="/sign-in" className="font-medium underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </article>
      }
    />
  )
}

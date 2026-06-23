import { InlineError } from '#/components/feedback/inline-error'
import { FormField } from '#/components/forms/form-field'
import { SecurityAnswerField } from '#/components/forms/security-answer-field'
import { changePasswordFormSchema } from '#/features/auth/schemas/security-profile'
import { authClient } from '#/lib/auth-client'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface RecoveryChallenge {
  questionOneLabel: string
}

/** Settings card for changing password with security-question verification. */
export function ChangePasswordSection() {
  const navigate = useNavigate()
  const [recoveryChallenge, setRecoveryChallenge] = useState<RecoveryChallenge | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [answerOne, setAnswerOne] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadRecoveryChallenge() {
      setIsProfileLoading(true)
      try {
        const response = await fetch('/api/auth/security-profile', { method: 'GET' })
        const payload = (await response.json().catch(() => null)) as {
          success?: boolean
          data?: {
            questionOneLabel: string
          } | null
        } | null

        if (!response.ok || !payload?.success || !payload.data) {
          setRecoveryChallenge(null)
          return
        }

        setRecoveryChallenge({
          questionOneLabel: payload.data.questionOneLabel,
        })
      } finally {
        setIsProfileLoading(false)
      }
    }

    void loadRecoveryChallenge()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setFieldErrors({})

    const parsed = changePasswordFormSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
      answerOne: recoveryChallenge ? answerOne : undefined,
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
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
          answerOne: parsed.data.answerOne,
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
      } | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to update password')
      }

      toast.success('Password updated. Sign in again on all devices.')
      await authClient.signOut()
      await navigate({ to: '/sign-in' })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <article className="feature-card rounded-xl border border-border p-5">
      <h2 className="text-lg font-semibold">Change Password</h2>
      <p className="mt-1 text-xs opacity-70">
        {recoveryChallenge
          ? 'Verify your security answer and current password. All active sessions will be signed out.'
          : 'Use your current password to set a new one. Add account recovery to require a security answer next time.'}
      </p>

      {isProfileLoading ? (
        <p className="mt-4 flex items-center gap-2 text-sm opacity-70">
          <Loader2 className="size-4 animate-spin" />
          Loading security requirements...
        </p>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit} autoComplete="off">
          {recoveryChallenge ? (
            <SecurityAnswerField
              id="change-password-answer-one"
              label={recoveryChallenge.questionOneLabel}
              value={answerOne}
              onChange={setAnswerOne}
              error={fieldErrors.answerOne}
              isDisabled={isSubmitting}
            />
          ) : null}

          <FormField
            id="current-password"
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Current password"
            error={fieldErrors.currentPassword}
            isDisabled={isSubmitting}
            autoComplete="current-password"
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
            autoComplete="new-password"
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
            autoComplete="new-password"
          />

          {errorMessage ? <InlineError message={errorMessage} /> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      )}
    </article>
  )
}

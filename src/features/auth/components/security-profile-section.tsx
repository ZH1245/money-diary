import { FormField } from '#/components/forms/form-field'
import { InlineError } from '#/components/feedback/inline-error'
import {
  SecurityProfileFields,
  getDefaultSecurityProfileFormValues,
} from '#/features/auth/components/security-profile-fields'
import type { SecurityQuestionKey } from '#/features/auth/constants/security-questions'
import { createSecurityProfileSchema, updateSecurityProfileSchema } from '#/features/auth/schemas/security-profile'
import { queryKeys } from '#/features/query-keys'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/** Settings card for viewing and updating account recovery details. */
export function SecurityProfileSection() {
  const queryClient = useQueryClient()
  const [hasProfile, setHasProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [currentPassword, setCurrentPassword] = useState('')
  const [form, setForm] = useState(getDefaultSecurityProfileFormValues())

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/auth/security-profile', { method: 'GET' })
        const payload = (await response.json().catch(() => null)) as {
          success?: boolean
          data?: {
            recoveryEmail: string
            questionOneKey: string
          } | null
        } | null

        if (!response.ok || !payload?.success) return

        if (payload.data) {
          setHasProfile(true)
          setForm({
            recoveryEmail: payload.data.recoveryEmail,
            questionOneKey: payload.data.questionOneKey as SecurityQuestionKey,
            answerOne: '',
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    void loadProfile()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setFieldErrors({})

    const schema = hasProfile ? updateSecurityProfileSchema : createSecurityProfileSchema
    const parsed = schema.safeParse(
      hasProfile
        ? {
            currentPassword,
            recoveryEmail: form.recoveryEmail,
            questionOneKey: form.questionOneKey,
            answerOne: form.answerOne || undefined,
          }
        : form,
    )

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
      const response = await fetch('/api/auth/security-profile', {
        method: hasProfile ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          hasProfile
            ? {
                currentPassword,
                recoveryEmail: form.recoveryEmail,
                questionOneKey: form.questionOneKey,
                answerOne: form.answerOne || undefined,
              }
            : form,
        ),
      })

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
      } | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to save recovery settings')
      }

      setHasProfile(true)
      setCurrentPassword('')
      setForm((previous) => ({ ...previous, answerOne: '' }))
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.securityProfile })
      toast.success('Recovery settings saved')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save recovery settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <article className="feature-card rounded-xl border border-border p-5 xl:col-span-2">
      <h2 className="text-lg font-semibold">Account recovery</h2>
      <p className="mt-1 text-xs opacity-70">
        Your recovery email and security answer are used for password reset. Email OTP verification is planned later.
      </p>

      {isLoading ? (
        <p className="mt-4 flex items-center gap-2 text-sm opacity-70">
          <Loader2 className="size-4 animate-spin" />
          Loading recovery settings...
        </p>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {hasProfile ? (
            <FormField
              id="recovery-current-password"
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Required to update recovery settings"
              isDisabled={isSubmitting}
            />
          ) : null}

          <SecurityProfileFields
            values={form}
            fieldErrors={fieldErrors}
            isDisabled={isSubmitting}
            onRecoveryEmailChange={(value) => setForm((previous) => ({ ...previous, recoveryEmail: value }))}
            onQuestionOneKeyChange={(value) => setForm((previous) => ({ ...previous, questionOneKey: value }))}
            onAnswerOneChange={(value) => setForm((previous) => ({ ...previous, answerOne: value }))}
          />

          {hasProfile ? (
            <p className="text-xs opacity-70">
              Leave the answer blank to keep your existing answer. Fill it in only when changing the question or answer.
            </p>
          ) : null}

          {errorMessage ? <InlineError message={errorMessage} /> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {hasProfile ? 'Update recovery settings' : 'Save recovery settings'}
          </button>
        </form>
      )}
    </article>
  )
}

import { InlineError } from '#/components/feedback/inline-error'
import {
  SecurityProfileFields,
  getDefaultSecurityProfileFormValues,
} from '#/features/auth/components/security-profile-fields'
import type { SecurityQuestionKey } from '#/features/auth/constants/security-questions'
import { createSecurityProfileSchema } from '#/features/auth/schemas/security-profile'
import { createSecurityProfileRequest, SecurityProfileRequestError } from '#/features/auth/api/security-profile-api'
import { queryKeys } from '#/features/query-keys'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

/** Collects required recovery details after account creation or for legacy users. */
export function SecuritySetupForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(getDefaultSecurityProfileFormValues())
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setFieldErrors({})

    const parsed = createSecurityProfileSchema.safeParse(form)
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
      await createSecurityProfileRequest(parsed.data)
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.securityProfile })
      toast.success('Account recovery saved')
      await navigate({ to: '/' })
    } catch (error) {
      if (error instanceof SecurityProfileRequestError && error.fieldErrors) {
        setFieldErrors(error.fieldErrors)
      }
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save recovery settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate autoComplete="off">
      <SecurityProfileFields
        values={form}
        fieldErrors={fieldErrors}
        isDisabled={isSubmitting}
        introTitle="Protect your account"
        introDescription="Add a backup email and one private answer only you would know. Both are required to reset your password later."
        onRecoveryEmailChange={(value) => setForm((previous) => ({ ...previous, recoveryEmail: value }))}
        onQuestionOneKeyChange={(value) =>
          setForm((previous) => ({ ...previous, questionOneKey: value as SecurityQuestionKey }))
        }
        onAnswerOneChange={(value) => setForm((previous) => ({ ...previous, answerOne: value }))}
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
            Saving recovery settings...
          </>
        ) : (
          'Save and continue'
        )}
      </button>
    </form>
  )
}

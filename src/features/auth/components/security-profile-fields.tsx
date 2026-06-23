import { FormField } from '#/components/forms/form-field'
import { SecurityAnswerField } from '#/components/forms/security-answer-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { SECURITY_QUESTIONS } from '#/features/auth/constants/security-questions'
import type { SecurityQuestionKey } from '#/features/auth/constants/security-questions'

export interface SecurityProfileFormValues {
  recoveryEmail: string
  questionOneKey: SecurityQuestionKey
  answerOne: string
}

interface SecurityProfileFieldsProps {
  values: SecurityProfileFormValues
  fieldErrors: Record<string, string>
  isDisabled?: boolean
  introTitle?: string
  introDescription?: string
  recoveryEmailReadOnly?: boolean
  onRecoveryEmailChange: (value: string) => void
  onQuestionOneKeyChange: (value: SecurityQuestionKey) => void
  onAnswerOneChange: (value: string) => void
}

/** Shared recovery email and security question fields for setup and settings. */
export function SecurityProfileFields({
  values,
  fieldErrors,
  isDisabled = false,
  introTitle = 'Account recovery',
  introDescription = 'A backup email plus one private answer help you reset your password and protect your account.',
  recoveryEmailReadOnly = false,
  onRecoveryEmailChange,
  onQuestionOneKeyChange,
  onAnswerOneChange,
}: SecurityProfileFieldsProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border/70 p-4">
      {/* Catch stray password-manager autofill before it reaches the answer field. */}
      <input
        type="password"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="new-password"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        defaultValue=""
        readOnly
      />

      <div>
        <h3 className="text-sm font-semibold">{introTitle}</h3>
        <p className="mt-1 text-xs opacity-70">{introDescription}</p>
      </div>

      <FormField
        id="recovery-email"
        label="Recovery email"
        type="email"
        value={values.recoveryEmail}
        onChange={onRecoveryEmailChange}
        placeholder="backup@example.com"
        isDisabled={isDisabled || recoveryEmailReadOnly}
        isRequired={!recoveryEmailReadOnly}
        error={fieldErrors.recoveryEmail}
        autoComplete="section-recovery email"
      />
      {recoveryEmailReadOnly ? (
        <p className="-mt-2 text-xs opacity-70">Same as your sign-in email and cannot be changed.</p>
      ) : null}

      <div>
        <label htmlFor="security-question-one" className="mb-1 block text-sm font-medium">
          Security question
        </label>
        <Select
          value={values.questionOneKey}
          onValueChange={(value) => onQuestionOneKeyChange(value as SecurityQuestionKey)}
          disabled={isDisabled}
        >
          <SelectTrigger id="security-question-one" className="h-10 w-full">
            <SelectValue placeholder="Select a question" />
          </SelectTrigger>
          <SelectContent>
            {SECURITY_QUESTIONS.map((question) => (
              <SelectItem key={question.key} value={question.key}>
                {question.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.questionOneKey ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.questionOneKey}</p>
        ) : null}
      </div>

      <SecurityAnswerField
        id="security-answer-one"
        label="Your answer"
        value={values.answerOne}
        onChange={onAnswerOneChange}
        isDisabled={isDisabled}
        error={fieldErrors.answerOne}
      />
    </div>
  )
}

export function getDefaultSecurityProfileFormValues(): SecurityProfileFormValues {
  return {
    recoveryEmail: '',
    questionOneKey: 'childhood_nickname',
    answerOne: '',
  }
}

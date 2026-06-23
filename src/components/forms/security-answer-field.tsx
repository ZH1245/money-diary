import { useState } from 'react'

interface SecurityAnswerFieldProps {
  id: string
  label: string
  value: string
  placeholder?: string
  error?: string
  isDisabled?: boolean
  isRequired?: boolean
  onChange: (value: string) => void
}

/**
 * Plain-text input for security question answers.
 * Uses read-only-until-focus and explicit non-password attributes so browsers
 * and password managers do not treat this as a password field.
 */
export function SecurityAnswerField({
  id,
  label,
  value,
  placeholder = 'Your answer',
  error,
  isDisabled = false,
  isRequired = true,
  onChange,
}: SecurityAnswerFieldProps) {
  const [isEditable, setIsEditable] = useState(false)

  function handleFocus() {
    setIsEditable(true)
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="text"
        name="recovery-question-response"
        required={isRequired}
        disabled={isDisabled}
        value={value}
        readOnly={!isEditable}
        onFocus={handleFocus}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-busy={isDisabled}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
        className={`h-10 w-full rounded-md border bg-background px-3 text-sm transition-colors ${
          error
            ? 'border-red-400 placeholder:text-red-300 focus-visible:outline-red-500/60'
            : 'border-border'
        } ${isDisabled ? 'cursor-not-allowed opacity-70' : ''}`}
        placeholder={placeholder}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      ) : null}
    </div>
  )
}

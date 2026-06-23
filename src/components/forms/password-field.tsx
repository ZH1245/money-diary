import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export type PasswordAutoComplete = 'current-password' | 'new-password' | 'off'

export interface PasswordFieldProps {
  id: string
  label: string
  value: string
  placeholder?: string
  isRequired?: boolean
  error?: string
  onChange: (value: string) => void
  isDisabled?: boolean
  autoComplete?: PasswordAutoComplete
}

/** Labeled password input with a show/hide visibility toggle. */
export function PasswordField({
  id,
  label,
  value,
  placeholder,
  isRequired = true,
  error,
  onChange,
  isDisabled = false,
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)

  function handleToggleVisibility() {
    setIsVisible((previous) => !previous)
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={isVisible ? 'text' : 'password'}
          required={isRequired}
          disabled={isDisabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-busy={isDisabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn(
            'h-10 pr-10',
            error
              ? 'border-red-400 placeholder:text-red-300 focus-visible:outline-red-500/60'
              : undefined,
            isDisabled ? 'cursor-not-allowed opacity-70' : undefined,
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={handleToggleVisibility}
          disabled={isDisabled}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
        >
          {isVisible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </Button>
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      ) : null}
    </div>
  )
}

import type { FormFieldProps } from '#/components/types/form-field'

/**
 * Renders a labeled input with error and disabled states.
 */
export function FormField({
  id,
  label,
  type,
  value,
  placeholder,
  isRequired = true,
  error,
  onChange,
  rightElement,
  isDisabled = false,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          required={isRequired}
          disabled={isDisabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-busy={isDisabled}
          className={`h-10 w-full rounded-md border bg-background px-3 text-sm transition-colors ${
            rightElement ? 'pr-10' : ''
          } ${
            error
              ? 'border-red-400 placeholder:text-red-300 focus-visible:outline-red-500/60'
              : 'border-border'
          } ${isDisabled ? 'cursor-not-allowed opacity-70' : ''}`}
          placeholder={placeholder}
        />
        {rightElement}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      ) : null}
    </div>
  )
}

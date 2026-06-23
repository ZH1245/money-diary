import type { ReactNode } from 'react'

/**
 * Props for the reusable form field component.
 */
export interface FormFieldProps {
  id: string
  label: string
  type: string
  value: string
  placeholder?: string
  isRequired?: boolean
  error?: string
  onChange: (value: string) => void
  rightElement?: ReactNode
  isDisabled?: boolean
  autoComplete?: string
  name?: string
  spellCheck?: boolean
  hasStoredValue?: boolean
  onRequestReveal?: () => void | Promise<void>
  isRevealPending?: boolean
  onHideStoredValue?: () => void
}

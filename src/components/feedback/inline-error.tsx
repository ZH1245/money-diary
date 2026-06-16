import { AlertCircle } from 'lucide-react'
import type { InlineErrorProps } from '#/components/types/feedback'

/**
 * Renders animated inline alert feedback for form/API errors.
 */
export function InlineError({ message }: InlineErrorProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

import {
  formatSensitiveText,
  PRIVACY_MASK_CLASS,
  usePrivacyModeEnabled,
} from '#/lib/privacy/sensitive-format'
import { cn } from '#/lib/utils'

interface SensitiveTextProps {
  text: string
  className?: string
}

/**
 * Renders text masked when privacy mode is enabled.
 */
export function SensitiveText({ text, className }: SensitiveTextProps) {
  const isPrivacyMode = usePrivacyModeEnabled()

  return (
    <span className={cn(isPrivacyMode ? PRIVACY_MASK_CLASS : 'min-w-0', className)}>
      {formatSensitiveText(text, isPrivacyMode)}
    </span>
  )
}

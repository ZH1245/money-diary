import {
  formatSensitiveCurrency,
  PRIVACY_MASK_CLASS,
  usePrivacyModeEnabled,
} from '#/lib/privacy/sensitive-format'
import { cn } from '#/lib/utils'

interface SensitiveAmountProps {
  amount: string | number
  currency: string
  className?: string
}

/**
 * Renders a currency amount masked when privacy mode is enabled.
 */
export function SensitiveAmount({ amount, currency, className }: SensitiveAmountProps) {
  const isPrivacyMode = usePrivacyModeEnabled()

  return (
    <span className={cn(isPrivacyMode ? PRIVACY_MASK_CLASS : 'min-w-0', className)}>
      {formatSensitiveCurrency(amount, currency, isPrivacyMode)}
    </span>
  )
}

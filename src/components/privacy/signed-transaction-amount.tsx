import {
  formatSensitiveCurrency,
  PRIVACY_MASK_CLASS,
  usePrivacyModeEnabled,
} from '#/lib/privacy/sensitive-format'
import { cn } from '#/lib/utils'

export type TransactionFlowType = 'income' | 'expense' | 'transfer'

interface SignedTransactionAmountProps {
  amount: string | number
  currency: string
  type: TransactionFlowType
  className?: string
}

/**
 * Renders transaction amounts with +/- signs and in/out colors in tables.
 */
export function SignedTransactionAmount({ amount, currency, type, className }: SignedTransactionAmountProps) {
  const isPrivacyMode = usePrivacyModeEnabled()
  const formattedAmount = formatSensitiveCurrency(amount, currency, isPrivacyMode)

  if (isPrivacyMode) {
    return <span className={cn(PRIVACY_MASK_CLASS, className)}>{formattedAmount}</span>
  }

  const sign = type === 'income' ? '+' : type === 'expense' ? '−' : ''
  const toneClass =
    type === 'income'
      ? 'text-emerald-600 dark:text-emerald-400'
      : type === 'expense'
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground'

  return (
    <span className={cn('font-medium tabular-nums', toneClass, className)}>
      {sign}
      {formattedAmount}
    </span>
  )
}

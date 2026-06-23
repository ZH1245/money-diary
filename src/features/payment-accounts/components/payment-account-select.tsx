import { SearchableSelect } from '#/components/forms/searchable-select'
import { formatPaymentAccountLabel } from '#/features/payment-accounts/utils/account-label'
import type { PaymentAccountDto } from '#/features/payment-accounts/types/payment-account'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'

interface PaymentAccountSelectProps {
  value: string
  onValueChange: (value: string) => void
  accounts: PaymentAccountDto[]
  disabled?: boolean
  showManageLink?: boolean
  label?: string
}

/**
 * Select control for linking a transaction or saving to a payment account.
 */
export function PaymentAccountSelect({
  value,
  onValueChange,
  accounts,
  disabled,
  showManageLink = true,
  label = 'Paid from / saved to',
}: PaymentAccountSelectProps) {
  const options = useMemo(
    () => [
      { value: 'none', label: 'Not specified' },
      ...accounts
        .filter((account) => account.isActive)
        .map((account) => ({
          value: String(account.id),
          label: formatPaymentAccountLabel(account),
        })),
    ],
    [accounts],
  )

  return (
    <div className="grid gap-2">
      {showManageLink ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          <Link to="/accounts" className="text-xs text-primary underline-offset-4 hover:underline">
            Manage
          </Link>
        </div>
      ) : null}
      <SearchableSelect
        value={value}
        onValueChange={onValueChange}
        options={options}
        placeholder="Not specified"
        searchPlaceholder="Search accounts..."
        emptyMessage="No accounts found."
        disabled={disabled}
      />
    </div>
  )
}

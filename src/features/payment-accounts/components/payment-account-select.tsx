import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { formatPaymentAccountLabel } from '#/features/payment-accounts/utils/account-label'
import type { PaymentAccountDto } from '#/features/payment-accounts/types/payment-account'
import { Link } from '@tanstack/react-router'

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
  const activeAccounts = accounts.filter((account) => account.isActive)

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
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Not specified" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not specified</SelectItem>
          {activeAccounts.map((account) => (
            <SelectItem key={account.id} value={String(account.id)}>
              {formatPaymentAccountLabel(account)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

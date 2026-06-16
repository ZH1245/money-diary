import { getInstitutionName } from '#/features/payment-accounts/constants/institutions'
import type { PaymentAccountDto } from '#/features/payment-accounts/types/payment-account'

const ACCOUNT_TYPE_LABELS: Record<PaymentAccountDto['accountType'], string> = {
  debit: 'Debit',
  credit: 'Credit',
  paypak: 'PayPak',
  wallet: 'Wallet',
  cash: 'Cash',
  other: 'Other',
}

/**
 * Builds a compact label for tables and selects.
 */
export function formatPaymentAccountLabel(account: PaymentAccountDto): string {
  const typeLabel = ACCOUNT_TYPE_LABELS[account.accountType]
  const institutionName = getInstitutionName(account.institutionSlug)

  if (institutionName && institutionName !== account.name) {
    return `${account.name} (${institutionName}) · ${typeLabel}`
  }

  return `${account.name} · ${typeLabel}`
}

/**
 * Human-readable account type label.
 */
export function formatPaymentAccountType(accountType: PaymentAccountDto['accountType']): string {
  return ACCOUNT_TYPE_LABELS[accountType]
}

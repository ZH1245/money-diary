import type { PaymentAccountType } from '#/features/payment-accounts/types/payment-account'

/** Form state for creating or editing a payment account. */
export interface AccountFormState {
  institutionChoice: string
  name: string
  accountType: PaymentAccountType
  note: string
  isActive: boolean
}

/** Returns empty defaults for the account create/edit sheet. */
export function getDefaultAccountForm(): AccountFormState {
  return {
    institutionChoice: 'custom',
    name: '',
    accountType: 'debit',
    note: '',
    isActive: true,
  }
}

export const ACCOUNT_TYPE_OPTIONS: Array<{ value: PaymentAccountType; label: string }> = [
  { value: 'debit', label: 'Debit card' },
  { value: 'credit', label: 'Credit card' },
  { value: 'paypak', label: 'PayPak' },
  { value: 'wallet', label: 'Mobile wallet' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
]

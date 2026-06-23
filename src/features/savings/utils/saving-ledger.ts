import { parseLedgerAmount } from '#/features/shared/utils/amount'

export const SAVING_ENTRY_TYPES = ['deposit', 'withdrawal'] as const

export type SavingEntryType = (typeof SAVING_ENTRY_TYPES)[number]

export const DEFAULT_SAVING_ENTRY_TYPE: SavingEntryType = 'deposit'

/**
 * Signed ledger delta: deposits add to saved balance, withdrawals subtract.
 */
export function getSavingLedgerDelta(
  amount: string,
  entryType: SavingEntryType = DEFAULT_SAVING_ENTRY_TYPE,
): number {
  const parsed = parseLedgerAmount(amount)
  return entryType === 'withdrawal' ? -parsed : parsed
}

/**
 * Payment-account delta when a saving is linked to an account.
 * Deposits leave the account; withdrawals return money to the account.
 */
export function getSavingPaymentAccountDelta(
  amount: string,
  entryType: SavingEntryType = DEFAULT_SAVING_ENTRY_TYPE,
): number {
  const parsed = parseLedgerAmount(amount)
  return entryType === 'withdrawal' ? parsed : -parsed
}

import { getSavingPaymentAccountDelta, type SavingEntryType } from '#/features/savings/utils/saving-ledger'
import { parseLedgerAmount } from '#/features/shared/utils/amount'
import {
  isTransferDirectionEncoded,
  isTransferSourceToken,
  parseTransferDirection,
} from '#/features/transactions/utils/transfer-direction'

export interface PaymentAccountBalanceTransaction {
  amount: string
  type: 'income' | 'expense' | 'transfer'
  paymentAccountId: number | null
  source?: string | null
}

export interface PaymentAccountBalanceSaving {
  amount: string
  paymentAccountId: number | null
  entryType?: SavingEntryType
}

/**
 * Computes the signed ledger delta a transaction applies to a payment account.
 */
export function getTransactionPaymentAccountDelta(
  transaction: PaymentAccountBalanceTransaction,
  paymentAccountId: number,
): number {
  if (transaction.paymentAccountId !== paymentAccountId) {
    return 0
  }

  const amount = parseLedgerAmount(transaction.amount)

  if (transaction.type === 'income') {
    return amount
  }

  if (transaction.type === 'expense') {
    return -amount
  }

  if (transaction.type === 'transfer') {
    if (!isTransferDirectionEncoded(transaction.source)) {
      return 0
    }

    const direction = parseTransferDirection(transaction.source)
    return direction === 'in' ? amount : -amount
  }

  return 0
}

/**
 * Computes the running balance for one payment account from linked transactions and savings.
 */
export function computePaymentAccountBalance({
  paymentAccountId,
  transactions,
  savings = [],
}: {
  paymentAccountId: number
  transactions: PaymentAccountBalanceTransaction[]
  savings?: PaymentAccountBalanceSaving[]
}): number {
  let balance = 0

  for (const transaction of transactions) {
    balance += getTransactionPaymentAccountDelta(transaction, paymentAccountId)
  }

  for (const saving of savings) {
    if (saving.paymentAccountId !== paymentAccountId) {
      continue
    }

    balance += getSavingPaymentAccountDelta(saving.amount, saving.entryType ?? 'deposit')
  }

  return balance
}

/**
 * Resolves the built-in Cash on hand account id when present.
 */
export function findCashPaymentAccountId(
  accounts: Array<{ id: number; institutionSlug: string | null }>,
): number | null {
  return accounts.find((account) => account.institutionSlug === 'cash')?.id ?? null
}

/**
 * Builds a map of payment account id to running balance.
 */
export function buildPaymentAccountBalances({
  accountIds,
  transactions,
  savings = [],
}: {
  accountIds: number[]
  transactions: PaymentAccountBalanceTransaction[]
  savings?: PaymentAccountBalanceSaving[]
}): Record<number, number> {
  return accountIds.reduce<Record<number, number>>((accumulator, accountId) => {
    accumulator[accountId] = computePaymentAccountBalance({
      paymentAccountId: accountId,
      transactions,
      savings,
    })
    return accumulator
  }, {})
}

/**
 * Returns a user-facing source label, hiding internal transfer direction tokens.
 */
export function formatTransactionSourceLabel(source: string | null | undefined): string | null {
  if (!source || isTransferSourceToken(source)) {
    return null
  }

  return source
}

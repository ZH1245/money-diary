import { parseLedgerAmount } from '#/features/shared/utils/amount'
import { format, isSameDay } from 'date-fns'

export interface TransactionDuplicateMatchInput {
  title: string
  amount: string
  type: 'income' | 'expense' | 'transfer'
  happenedAt: Date
}

export interface TransactionDuplicateCandidate {
  id: number
  title: string
  amount: string
  type: string
  happenedAt: Date
}

/**
 * Normalizes titles for duplicate comparison (case and spacing).
 */
export function normalizeTransactionTitleForDuplicate(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Returns true when two ledger amounts match within one cent.
 */
export function transactionAmountsMatch(first: string, second: string): boolean {
  return Math.abs(parseLedgerAmount(first) - parseLedgerAmount(second)) < 0.01
}

/**
 * Finds an existing row that matches title, amount, type, and calendar day.
 */
export function findTransactionDuplicate(
  candidates: TransactionDuplicateCandidate[],
  input: TransactionDuplicateMatchInput,
): TransactionDuplicateCandidate | null {
  const normalizedTitle = normalizeTransactionTitleForDuplicate(input.title)

  for (const candidate of candidates) {
    if (candidate.type !== input.type) {
      continue
    }

    if (!isSameDay(candidate.happenedAt, input.happenedAt)) {
      continue
    }

    if (!transactionAmountsMatch(candidate.amount, input.amount)) {
      continue
    }

    if (normalizeTransactionTitleForDuplicate(candidate.title) !== normalizedTitle) {
      continue
    }

    return candidate
  }

  return null
}

/**
 * Formats a duplicate match for user-visible AI messages (no internal refs).
 */
export function formatTransactionDuplicateMessage(
  existing: TransactionDuplicateCandidate,
  currency: string,
): string {
  const dateLabel = format(existing.happenedAt, 'MMM d, yyyy')
  return `Already on file: "${existing.title}" — ${existing.amount} ${currency} on ${dateLabel}. Skipped duplicate.`
}

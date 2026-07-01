import { format } from 'date-fns'
import type { PaymentAccountDto } from '#/features/payment-accounts/types/payment-account'
import { formatPaymentAccountLabel } from '#/features/payment-accounts/utils/account-label'
import type { TransactionDto } from '#/features/transactions/types/transaction'
import {
  isTransferSourceToken,
  TRANSFER_SOURCE_IN,
  TRANSFER_SOURCE_OUT,
} from '#/features/transactions/utils/transfer-direction'
import { formatTransactionHappenedAtCompact, formatTransactionHappenedAtLabel } from '#/lib/date-input'
import { transactionTypeChartColors } from '#/lib/chart-colors'

export interface TransactionFormState {
  title: string
  amount: string
  currency: string
  exchangeRate: string
  type: 'income' | 'expense' | 'transfer'
  categoryId: string
  paymentAccountId: string
  fromPaymentAccountId: string
  toPaymentAccountId: string
  source: string
  note: string
  happenedAt: string
  happenedAtTime: string
}

export interface TransactionTableRow {
  id: number
  title: string
  amount: string
  sourceAmount: string | null
  sourceCurrency: string
  exchangeRate: string
  type: 'income' | 'expense' | 'transfer'
  categoryId: number | null
  categoryLabel: string
  paymentAccountId: number | null
  accountLabel: string
  source: string
  transferGroupId: string | null
  /** For a transfer leg: "From → To" label across both accounts. */
  transferRouteLabel: string | null
  note: string
  happenedAt: string
  happenedAtLabel: string
  happenedAtCompactLabel: string
}

/**
 * Returns default values for the transaction create/edit form.
 */
export function getDefaultTransactionForm(userCurrency: string): TransactionFormState {
  return {
    title: '',
    amount: '',
    currency: userCurrency,
    exchangeRate: '1',
    type: 'expense',
    categoryId: '',
    paymentAccountId: 'none',
    fromPaymentAccountId: 'none',
    toPaymentAccountId: 'none',
    source: '',
    note: '',
    happenedAt: format(new Date(), 'yyyy-MM-dd'),
    happenedAtTime: format(new Date(), 'HH:mm'),
  }
}

/**
 * Formats currency amounts while handling invalid numeric values gracefully.
 */
export function formatTransactionCurrency(amount: string, currency: string): string {
  const parsedAmount = Number(amount)
  if (!Number.isFinite(parsedAmount)) return amount
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(parsedAmount)
}

/**
 * Groups transactions into totals by type for charts.
 */
export function buildTransactionTotals(
  transactions: Array<{ amount: string; type: 'income' | 'expense' | 'transfer' }>,
) {
  return transactions.reduce<Record<'income' | 'expense' | 'transfer', number>>(
    (accumulator, transaction) => {
      const parsedAmount = Number(transaction.amount)
      if (!Number.isFinite(parsedAmount)) return accumulator
      return {
        ...accumulator,
        [transaction.type]: accumulator[transaction.type] + parsedAmount,
      }
    },
    {
      income: 0,
      expense: 0,
      transfer: 0,
    },
  )
}

/**
 * Converts grouped totals into chart rows.
 */
export function buildTransactionChartData(totals: Record<'income' | 'expense' | 'transfer', number>) {
  return [
    { name: 'Income' as const, amount: totals.income, color: transactionTypeChartColors.Income },
    { name: 'Expense' as const, amount: totals.expense, color: transactionTypeChartColors.Expense },
    { name: 'Transfer' as const, amount: totals.transfer, color: transactionTypeChartColors.Transfer },
  ].filter((entry) => entry.amount > 0)
}

/**
 * Resolves a display label for a transaction category.
 */
export function getTransactionCategoryLabel(
  type: TransactionDto['type'],
  categoryId: number | null,
  categories: Array<{ id: number; name: string }>,
): string {
  if (type === 'income') {
    return '—'
  }

  if (categoryId == null) {
    return type === 'transfer' ? '—' : 'Uncategorized'
  }

  return categories.find((category) => category.id === categoryId)?.name ?? 'Unknown'
}

/**
 * Normalizes transaction rows for table rendering.
 */
export function buildTransactionTableRows(
  transactions: TransactionDto[],
  paymentAccounts: PaymentAccountDto[],
  categories: Array<{ id: number; name: string }> = [],
): TransactionTableRow[] {
  const accountsById = paymentAccounts.reduce<Record<number, PaymentAccountDto>>((accumulator, account) => {
    accumulator[account.id] = account
    return accumulator
  }, {})

  const accountLabelFor = (paymentAccountId: number | null): string =>
    paymentAccountId ? formatPaymentAccountLabel(accountsById[paymentAccountId]) : ''

  const transferRoutesByGroup = buildTransferRoutesByGroup(transactions, accountLabelFor)

  return transactions.map((transaction) => ({
    id: transaction.id,
    title: transaction.title,
    amount: transaction.amount,
    sourceAmount: transaction.sourceAmount,
    sourceCurrency: transaction.sourceCurrency,
    exchangeRate: transaction.exchangeRate,
    type: transaction.type,
    categoryId: transaction.categoryId,
    categoryLabel: getTransactionCategoryLabel(transaction.type, transaction.categoryId, categories),
    paymentAccountId: transaction.paymentAccountId,
    accountLabel: accountLabelFor(transaction.paymentAccountId),
    source: transaction.source ?? '',
    transferGroupId: transaction.transferGroupId,
    transferRouteLabel: transaction.transferGroupId
      ? (transferRoutesByGroup[transaction.transferGroupId] ?? null)
      : null,
    note: transaction.note ?? '',
    happenedAt: transaction.happenedAt,
    happenedAtLabel: formatTransactionHappenedAtLabel(transaction.happenedAt),
    happenedAtCompactLabel: formatTransactionHappenedAtCompact(transaction.happenedAt),
  }))
}

/**
 * Builds a "From → To" label per transfer group from its two legs.
 */
function buildTransferRoutesByGroup(
  transactions: TransactionDto[],
  accountLabelFor: (paymentAccountId: number | null) => string,
): Record<string, string> {
  const fromByGroup: Record<string, string> = {}
  const toByGroup: Record<string, string> = {}

  for (const transaction of transactions) {
    if (!transaction.transferGroupId) {
      continue
    }

    if (transaction.source === TRANSFER_SOURCE_OUT) {
      fromByGroup[transaction.transferGroupId] = accountLabelFor(transaction.paymentAccountId)
    } else if (transaction.source === TRANSFER_SOURCE_IN) {
      toByGroup[transaction.transferGroupId] = accountLabelFor(transaction.paymentAccountId)
    }
  }

  const routes: Record<string, string> = {}
  for (const groupId of new Set([...Object.keys(fromByGroup), ...Object.keys(toByGroup)])) {
    const from = fromByGroup[groupId] || '?'
    const to = toByGroup[groupId] || '?'
    routes[groupId] = `${from} → ${to}`
  }

  return routes
}

/**
 * Resolves the account picker label for the active transaction type.
 */
export function getTransactionPaymentAccountLabel(type: TransactionFormState['type']): string {
  if (type === 'income') {
    return 'Received in'
  }

  if (type === 'transfer') {
    return 'Account'
  }

  return 'Paid from'
}

/**
 * Builds the API source field from form state for non-transfer entries.
 */
export function resolveTransactionSourceForSave(form: TransactionFormState): string | undefined {
  const trimmedSource = form.source.trim()
  if (!trimmedSource || isTransferSourceToken(trimmedSource)) {
    return undefined
  }

  return trimmedSource
}

interface TransactionTableFilterInput {
  categoryId: 'all' | string
  accountId: 'all' | string
  dateFrom: string
  dateTo: string
}

/**
 * Applies table toolbar filters to transaction rows.
 */
export function filterTransactionTableRows(
  rows: TransactionTableRow[],
  filters: TransactionTableFilterInput,
): TransactionTableRow[] {
  return rows.filter((row) => {
    if (filters.categoryId !== 'all' && String(row.categoryId) !== filters.categoryId) {
      return false
    }

    if (filters.accountId !== 'all' && String(row.paymentAccountId) !== filters.accountId) {
      return false
    }

    if (filters.dateFrom && row.happenedAt < filters.dateFrom) {
      return false
    }

    if (filters.dateTo && row.happenedAt > filters.dateTo) {
      return false
    }

    return true
  })
}

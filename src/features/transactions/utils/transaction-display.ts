import { format } from 'date-fns'
import type { PaymentAccountDto } from '#/features/payment-accounts/types/payment-account'
import { formatPaymentAccountLabel } from '#/features/payment-accounts/utils/account-label'
import type { TransactionDto } from '#/features/transactions/types/transaction'
import {
  formatTransferSource,
  isTransferSourceToken,
  parseTransferDirection,
} from '#/features/transactions/utils/transfer-direction'
import { transactionTypeChartColors } from '#/lib/chart-colors'

export interface TransactionFormState {
  title: string
  amount: string
  currency: string
  exchangeRate: string
  type: 'income' | 'expense' | 'transfer'
  categoryId: string
  paymentAccountId: string
  transferDirection: 'in' | 'out'
  source: string
  note: string
  happenedAt: string
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
  note: string
  happenedAt: string
  happenedAtLabel: string
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
    transferDirection: 'out',
    source: '',
    note: '',
    happenedAt: format(new Date(), 'yyyy-MM-dd'),
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
    return 'Uncategorized'
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
    accountLabel: transaction.paymentAccountId
      ? formatPaymentAccountLabel(accountsById[transaction.paymentAccountId])
      : '',
    source: transaction.source ?? '',
    note: transaction.note ?? '',
    happenedAt: transaction.happenedAt,
    happenedAtLabel: new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
    }).format(new Date(transaction.happenedAt)),
  }))
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
 * Builds the API source field from form state, encoding transfer direction when needed.
 */
export function resolveTransactionSourceForSave(form: TransactionFormState): string | undefined {
  if (form.type === 'transfer') {
    return formatTransferSource(form.transferDirection)
  }

  const trimmedSource = form.source.trim()
  if (!trimmedSource || isTransferSourceToken(trimmedSource)) {
    return undefined
  }

  return trimmedSource
}

/**
 * Hydrates transfer direction from a stored transaction source value.
 */
export function getTransferDirectionFromTransactionSource(source: string | null | undefined): 'in' | 'out' {
  return parseTransferDirection(source)
}

import { format } from 'date-fns'
import type { PaymentAccountDto } from '#/features/payment-accounts/types/payment-account'
import { formatPaymentAccountLabel } from '#/features/payment-accounts/utils/account-label'
import type { TransactionDto } from '#/features/transactions/types/transaction'
import { transactionTypeChartColors } from '#/lib/chart-colors'

export interface TransactionFormState {
  title: string
  amount: string
  currency: string
  exchangeRate: string
  type: 'income' | 'expense' | 'transfer'
  categoryId: string
  paymentAccountId: string
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
 * Normalizes transaction rows for table rendering.
 */
export function buildTransactionTableRows(
  transactions: TransactionDto[],
  paymentAccounts: PaymentAccountDto[],
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

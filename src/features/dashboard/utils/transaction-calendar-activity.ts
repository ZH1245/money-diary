import type { TransactionDto } from '#/features/transactions/types/transaction'
import { toInputDate } from '#/lib/date-input'

export interface DayTransactionActivity {
  income: boolean
  expense: boolean
  transfer: boolean
  incomeTotal: number
  expenseTotal: number
  transferTotal: number
}

/**
 * Maps each calendar day to which transaction types occurred, with running totals for hover stats.
 */
export function buildTransactionCalendarActivity(
  transactions: TransactionDto[],
): Record<string, DayTransactionActivity> {
  const activityByDate: Record<string, DayTransactionActivity> = {}

  for (const transaction of transactions) {
    const dateKey = toInputDate(transaction.happenedAt)
    const current = activityByDate[dateKey] ?? {
      income: false,
      expense: false,
      transfer: false,
      incomeTotal: 0,
      expenseTotal: 0,
      transferTotal: 0,
    }
    const amount = Number(transaction.amount) || 0

    if (transaction.type === 'income') {
      current.income = true
      current.incomeTotal += amount
    } else if (transaction.type === 'expense') {
      current.expense = true
      current.expenseTotal += amount
    } else if (transaction.type === 'transfer') {
      current.transfer = true
      current.transferTotal += amount
    }

    activityByDate[dateKey] = current
  }

  return activityByDate
}

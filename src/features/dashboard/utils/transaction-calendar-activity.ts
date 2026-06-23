import type { TransactionDto } from '#/features/transactions/types/transaction'
import { format, parseISO } from 'date-fns'

export interface DayTransactionActivity {
  income: boolean
  expense: boolean
  transfer: boolean
}

/**
 * Maps each calendar day to which transaction types occurred on that day.
 */
export function buildTransactionCalendarActivity(
  transactions: TransactionDto[],
): Record<string, DayTransactionActivity> {
  const activityByDate: Record<string, DayTransactionActivity> = {}

  for (const transaction of transactions) {
    const dateKey = format(parseISO(transaction.happenedAt), 'yyyy-MM-dd')
    const current = activityByDate[dateKey] ?? { income: false, expense: false, transfer: false }

    if (transaction.type === 'income') {
      current.income = true
    } else if (transaction.type === 'expense') {
      current.expense = true
    } else if (transaction.type === 'transfer') {
      current.transfer = true
    }

    activityByDate[dateKey] = current
  }

  return activityByDate
}

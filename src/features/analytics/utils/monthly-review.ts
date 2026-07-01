import {
  endOfMonth,
  format,
  isBefore,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { buildNetWorth } from '#/features/analytics/utils/analytics-stats'
import { isDateInRange } from '#/features/dashboard/utils/dashboard-date-range'
import { buildPaymentAccountBalances } from '#/features/payment-accounts/utils/payment-account-balance'
import { buildSavingsPageStats } from '#/features/savings/utils/savings-stats'
import { parseLedgerAmount } from '#/features/shared/utils/amount'

export interface MonthlyReviewAccountBalance {
  accountId: number
  label: string
  balance: number
}

export interface MonthlyReviewSummary {
  monthKey: string
  monthLabel: string
  income: number
  expense: number
  savingsDeposits: number
  savingsWithdrawals: number
  netSavedInMonth: number
  unallocatedCashFlow: number
  endingNetWorth: number
  endingInAccounts: number
  accountBalances: MonthlyReviewAccountBalance[]
}

interface MonthlyReviewInput {
  monthKey: string
  transactions: Array<{
    amount: string
    type: string
    happenedAt: string
    paymentAccountId: number | null
    source?: string | null
  }>
  savings: Array<{
    amount: string
    savedAt: string
    paymentAccountId: number | null
    entryType?: 'deposit' | 'withdrawal'
    goalId?: number | null
  }>
  paymentAccounts: Array<{ id: number }>
  resolveAccountLabel: (accountId: number) => string
}

/**
 * Returns the most recently completed calendar month key (YYYY-MM).
 */
export function getDefaultReviewMonthKey(referenceDate = new Date()): string {
  return format(subMonths(startOfMonth(referenceDate), 1), 'yyyy-MM')
}

/**
 * Lists completed month keys that have ledger activity, newest first.
 */
export function getReviewMonthOptions(
  transactions: Array<{ happenedAt: string }>,
  savings: Array<{ savedAt: string }>,
  referenceDate = new Date(),
  limit = 12,
): string[] {
  const timestamps = [
    ...transactions.map((row) => new Date(row.happenedAt).getTime()),
    ...savings.map((row) => new Date(row.savedAt).getTime()),
  ].filter((value) => Number.isFinite(value))

  if (timestamps.length === 0) {
    return [getDefaultReviewMonthKey(referenceDate)]
  }

  const earliest = startOfMonth(new Date(Math.min(...timestamps)))
  const latestCompleted = startOfMonth(subMonths(startOfMonth(referenceDate), 1))
  const months: string[] = []

  let cursor = latestCompleted
  while (!isBefore(cursor, earliest) && months.length < limit) {
    months.push(format(cursor, 'yyyy-MM'))
    cursor = subMonths(cursor, 1)
  }

  return months.length > 0 ? months : [getDefaultReviewMonthKey(referenceDate)]
}

function isOnOrBefore(isoValue: string, cutoff: Date): boolean {
  const parsed = new Date(isoValue)
  if (Number.isNaN(parsed.getTime())) {
    return false
  }

  return parsed.getTime() <= cutoff.getTime()
}

/**
 * Builds a month-end review from ledger history as of the last moment of that month.
 */
export function buildMonthlyReview(input: MonthlyReviewInput): MonthlyReviewSummary {
  const monthStart = startOfMonth(parseISO(`${input.monthKey}-01`))
  const monthEnd = endOfMonth(monthStart)
  const rangeFrom = format(monthStart, 'yyyy-MM-dd')
  const rangeTo = format(monthEnd, 'yyyy-MM-dd')
  const monthLabel = format(monthStart, 'MMMM yyyy')

  const transactionsInMonth = input.transactions.filter((transaction) =>
    isDateInRange(transaction.happenedAt, rangeFrom, rangeTo),
  )
  const savingsInMonth = input.savings.filter((entry) =>
    isDateInRange(entry.savedAt, rangeFrom, rangeTo),
  )

  let income = 0
  let expense = 0
  for (const transaction of transactionsInMonth) {
    const amount = parseLedgerAmount(transaction.amount)
    if (transaction.type === 'income') {
      income += amount
    }
    if (transaction.type === 'expense') {
      expense += amount
    }
  }

  const monthSavingsStats = buildSavingsPageStats(
    savingsInMonth.map((entry) => ({
      amount: entry.amount,
      goalId: entry.goalId ?? null,
      entryType: entry.entryType,
    })),
  )

  const transactionsAsOf = input.transactions.filter((transaction) =>
    isOnOrBefore(transaction.happenedAt, monthEnd),
  )
  const savingsAsOf = input.savings.filter((entry) => isOnOrBefore(entry.savedAt, monthEnd))

  const accountIds = input.paymentAccounts.map((account) => account.id)
  const balanceRows = transactionsAsOf.map((transaction) => ({
    amount: transaction.amount,
    type: transaction.type as 'income' | 'expense' | 'transfer',
    paymentAccountId: transaction.paymentAccountId,
    source: transaction.source,
  }))
  const savingsRows = savingsAsOf.map((entry) => ({
    amount: entry.amount,
    paymentAccountId: entry.paymentAccountId,
    entryType: entry.entryType,
    goalId: entry.goalId,
  }))

  const balances = buildPaymentAccountBalances({
    accountIds,
    transactions: balanceRows,
    savings: savingsRows,
  })

  const accountBalances = accountIds.map((accountId) => ({
    accountId,
    label: input.resolveAccountLabel(accountId),
    balance: balances[accountId] ?? 0,
  }))

  const endingInAccounts = accountBalances.reduce((sum, row) => sum + row.balance, 0)
  const endingNetWorth = buildNetWorth({
    accountIds,
    transactions: balanceRows,
    savings: savingsRows,
  }).netWorth

  const unallocatedCashFlow = Math.max(
    0,
    income - expense - monthSavingsStats.totalDeposits,
  )

  return {
    monthKey: input.monthKey,
    monthLabel,
    income,
    expense,
    savingsDeposits: monthSavingsStats.totalDeposits,
    savingsWithdrawals: monthSavingsStats.totalWithdrawals,
    netSavedInMonth: monthSavingsStats.totalSaved,
    unallocatedCashFlow,
    endingNetWorth,
    endingInAccounts,
    accountBalances: accountBalances.sort((first, second) => second.balance - first.balance),
  }
}

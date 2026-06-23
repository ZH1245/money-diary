import { parseLedgerAmount } from '#/features/shared/utils/amount'
import { getSavingLedgerDelta } from '#/features/savings/utils/saving-ledger'
import { buildTrendSeriesForDateRange } from '#/features/dashboard/utils/dashboard-date-range'
import type { DashboardStatsInput, DashboardStatsOutput } from '#/features/dashboard/types/dashboard-stats'
import { computePaymentAccountBalance } from '#/features/payment-accounts/utils/payment-account-balance'

/** Formats transaction dates for dashboard table rows. */
export function formatDashboardTransactionDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

/** Builds aggregate metrics for the dashboard view. */
export function buildDashboardStats({
  transactions,
  allTransactions,
  allSavings,
  cashPaymentAccountId,
  categories,
  savings,
  wishlist,
  goals,
  dateRange,
}: DashboardStatsInput): DashboardStatsOutput {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + parseLedgerAmount(transaction.amount), 0)

  const totalExpense = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + parseLedgerAmount(transaction.amount), 0)

  const expenseByCategoryId = transactions.reduce<Record<number, number>>((accumulator, transaction) => {
    if (transaction.type !== 'expense' || transaction.categoryId === null) return accumulator

    const currentAmount = accumulator[transaction.categoryId] ?? 0
    return {
      ...accumulator,
      [transaction.categoryId]: currentAmount + parseLedgerAmount(transaction.amount),
    }
  }, {})

  const topExpenseEntry = Object.entries(expenseByCategoryId).sort((a, b) => b[1] - a[1])[0]
  const topExpenseCategoryId = topExpenseEntry ? Number(topExpenseEntry[0]) : null
  const topExpenseCategory = categories.find((category) => category.id === topExpenseCategoryId)

  const recentTransactions = [...transactions]
    .sort((first, second) => Number(new Date(second.happenedAt)) - Number(new Date(first.happenedAt)))
    .slice(0, 5)
    .map((transaction) => ({
      id: transaction.id,
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      happenedAt: transaction.happenedAt,
      happenedAtLabel: formatDashboardTransactionDate(transaction.happenedAt),
    }))

  const personalCategoryCount = categories.filter((category) => Boolean(category.userId)).length
  const globalCategoryCount = categories.length - personalCategoryCount
  const totalSaved = savings.reduce(
    (sum, item) => sum + getSavingLedgerDelta(item.amount, item.entryType ?? 'deposit'),
    0,
  )
  const totalWishlistTarget = wishlist.reduce((sum, item) => sum + parseLedgerAmount(item.targetAmount), 0)
  const totalGoalTarget = goals.reduce((sum, item) => sum + parseLedgerAmount(item.targetAmount), 0)
  const weeklyTrend = buildTrendSeriesForDateRange(transactions, dateRange.from, dateRange.to, parseLedgerAmount)
  const calendar = {
    monthLabel: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date()),
  }

  const cashOnHandBalance =
    cashPaymentAccountId != null && allTransactions
      ? computePaymentAccountBalance({
          paymentAccountId: cashPaymentAccountId,
          transactions: allTransactions,
          savings: allSavings ?? [],
        })
      : null

  return {
    balance: totalIncome - totalExpense,
    totalIncome,
    totalExpense,
    transactionCount: transactions.length,
    totalSaved,
    totalWishlistTarget,
    totalGoalTarget,
    categoryCount: categories.length,
    personalCategoryCount,
    globalCategoryCount,
    topExpenseCategoryLabel: topExpenseCategory?.name ?? 'No expense data',
    topExpenseCategoryAmount: topExpenseEntry ? topExpenseEntry[1] : 0,
    recentTransactions,
    weeklyTrend,
    calendar,
    cashOnHandBalance,
  }
}

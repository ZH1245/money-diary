export interface RecentTransactionRow {
  id: number
  title: string
  amount: string
  type: string
  happenedAt: string
  happenedAtLabel: string
}

export interface DashboardStatsInput {
  transactions: Array<{
    id: number
    title: string
    amount: string
    type: string
    categoryId: number | null
    happenedAt: string
  }>
  categories: Array<{
    id: number
    name: string
    userId?: string | null
  }>
  savings: Array<{
    amount: string
    savedAt: string
  }>
  wishlist: Array<{
    targetAmount: string
  }>
  goals: Array<{
    targetAmount: string
  }>
  dateRange: {
    from: string
    to: string
  }
}

export interface DashboardStatsOutput {
  balance: number
  totalIncome: number
  totalExpense: number
  transactionCount: number
  totalSaved: number
  totalWishlistTarget: number
  totalGoalTarget: number
  categoryCount: number
  personalCategoryCount: number
  globalCategoryCount: number
  topExpenseCategoryLabel: string
  topExpenseCategoryAmount: number
  recentTransactions: RecentTransactionRow[]
  weeklyTrend: Array<{
    week: string
    income: number
    expense: number
  }>
  calendar: {
    monthLabel: string
  }
}

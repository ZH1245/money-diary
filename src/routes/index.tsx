import { DataTable, DataTableColumnHeader } from '#/components/data-table/data-table'
import { DashboardLoadingSkeleton, SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { Calendar } from '#/components/ui/calendar'
import { useCategoriesQuery } from '#/features/categories/hooks/use-categories'
import { dashboardDateRangeStore } from '#/features/dashboard/store/dashboard-date-range-store'
import { buildTrendSeriesForDateRange, isDateInRange } from '#/features/dashboard/utils/dashboard-date-range'
import { useGoalsQuery } from '#/features/goals/hooks/use-goals'
import { useSavingsQuery } from '#/features/savings/hooks/use-savings'
import { useTransactionsQuery } from '#/features/transactions/hooks/use-transactions'
import { useWishlistQuery } from '#/features/wishlist/hooks/use-wishlist'
import { authClient } from '#/lib/auth-client'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { SensitiveAmount } from '#/components/privacy/sensitive-amount'
import { SensitiveText } from '#/components/privacy/sensitive-text'
import { formatSensitiveCompactAmount, formatSensitiveCurrency, formatSensitiveText, usePrivacyModeEnabled } from '#/lib/privacy/sensitive-format'
import { chartColors } from '#/lib/chart-colors'
import { Wallet, TrendingUp, TrendingDown, Target, Star, WalletCards } from 'lucide-react'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useStore } from '@tanstack/react-store'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <SessionLoadingSkeleton />
  }

  if (!session?.user) {
    return <Navigate to="/sign-in" />
  }

  const userCurrency = ((session.user as { currency?: string }).currency ?? DEFAULT_CURRENCY).toUpperCase()

  return (
    <AuthenticatedAppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: (session.user as { role?: string }).role,
        currency: (session.user as { currency?: string }).currency,
      }}
    >
      <HomeContent userCurrency={userCurrency} />
    </AuthenticatedAppShell>
  )
}

function HomeContent({ userCurrency }: { userCurrency: string }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const dateRange = useStore(dashboardDateRangeStore, (state) => state)
  const {
    data: transactions = [],
    isPending: isTransactionsPending,
    isError: isTransactionsError,
    error: transactionsError,
  } = useTransactionsQuery()
  const {
    data: categories = [],
    isPending: isCategoriesPending,
    isError: isCategoriesError,
    error: categoriesError,
  } = useCategoriesQuery()
  const { data: savings = [], isError: isSavingsError, error: savingsError } = useSavingsQuery()
  const { data: wishlist = [], isError: isWishlistError, error: wishlistError } = useWishlistQuery()
  const { data: goals = [], isError: isGoalsError, error: goalsError } = useGoalsQuery()
  const isPrivacyMode = usePrivacyModeEnabled()

  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => isDateInRange(transaction.happenedAt, dateRange.from, dateRange.to)),
    [transactions, dateRange.from, dateRange.to],
  )
  const filteredSavings = useMemo(
    () => savings.filter((saving) => isDateInRange(saving.savedAt, dateRange.from, dateRange.to)),
    [savings, dateRange.from, dateRange.to],
  )
  const stats = useMemo(
    () =>
      buildDashboardStats({
        transactions: filteredTransactions,
        categories,
        savings: filteredSavings,
        wishlist,
        goals,
        dateRange,
      }),
    [filteredTransactions, categories, filteredSavings, wishlist, goals, dateRange],
  )

  const isStatsPending = isTransactionsPending || isCategoriesPending
  const statsError = isTransactionsError ? transactionsError : isCategoriesError ? categoriesError : null
  const secondaryDataError = isSavingsError
    ? savingsError
    : isWishlistError
      ? wishlistError
      : isGoalsError
        ? goalsError
        : null

  const recentTransactionColumns = useMemo<ColumnDef<RecentTransactionRow>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => <SensitiveText text={row.original.title} />,
      },
      {
        accessorKey: 'happenedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => row.original.happenedAtLabel,
        sortingFn: (first, second) =>
          new Date(first.original.happenedAt).getTime() - new Date(second.original.happenedAt).getTime(),
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => <span className="capitalize">{row.original.type}</span>,
      },
      {
        id: 'amount',
        accessorFn: (row) => Number(row.amount),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" className="w-full justify-end" />
        ),
        meta: { cellClassName: 'text-right font-medium' },
        cell: ({ row }) => <SensitiveAmount amount={row.original.amount} currency={userCurrency} />,
      },
    ],
    [userCurrency, isPrivacyMode],
  )

  return (
    <main className="p-6 md:p-8">
        <section className="space-y-6">
          {isStatsPending ? <DashboardLoadingSkeleton /> : null}
          {statsError ? <p className="text-sm text-red-600">{statsError.message}</p> : null}
          {secondaryDataError ? (
            <p className="text-sm text-amber-700">Some dashboard data could not be loaded: {secondaryDataError.message}</p>
          ) : null}

          {!isStatsPending && !statsError ? (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <InsightMiniCard
                  icon={<Wallet className="size-4 text-slate-600" />}
                  label="Total Balance"
                  value={formatSensitiveCurrency(stats.balance, userCurrency, isPrivacyMode)}
                  isSensitive
                />
                <InsightMiniCard
                  icon={<TrendingUp className="size-4 text-emerald-600" />}
                  label="Total Income"
                  value={formatSensitiveCurrency(stats.totalIncome, userCurrency, isPrivacyMode)}
                  isSensitive
                />
                <InsightMiniCard
                  icon={<TrendingDown className="size-4 text-rose-600" />}
                  label="Total Expenses"
                  value={formatSensitiveCurrency(stats.totalExpense, userCurrency, isPrivacyMode)}
                  isSensitive
                />
                <InsightMiniCard
                  icon={<Wallet className="size-4 text-sky-600" />}
                  label="Transactions"
                  value={String(stats.transactionCount)}
                />
                <InsightMiniCard
                  icon={<WalletCards className="size-4 text-indigo-600" />}
                  label="Saved"
                  value={formatSensitiveCurrency(stats.totalSaved, userCurrency, isPrivacyMode)}
                  isSensitive
                />
                <InsightMiniCard
                  icon={<Star className="size-4 text-amber-600" />}
                  label="Wishlist"
                  value={formatSensitiveCurrency(stats.totalWishlistTarget, userCurrency, isPrivacyMode)}
                  isSensitive
                />
                <InsightMiniCard
                  icon={<Target className="size-4 text-rose-600" />}
                  label="Goals"
                  value={formatSensitiveCurrency(stats.totalGoalTarget, userCurrency, isPrivacyMode)}
                  isSensitive
                />
              </div>

              <div className="grid items-start gap-4 xl:grid-cols-[2fr_1fr]">
                <div className="feature-card rounded-2xl border border-border p-5 xl:min-h-[460px]">
                  <div>
                    <p className="text-xl font-semibold">Money Insight</p>
                    <p className="mt-1 text-xs opacity-70">Income vs expenses for selected range</p>
                  </div>

                  <div className="mt-4 h-72 w-full xl:h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.weeklyTrend}>
                        <defs>
                          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.income} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={chartColors.income} stopOpacity={0.03} />
                          </linearGradient>
                          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.expense} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={chartColors.expense} stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="week"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          tickFormatter={(value) => formatSensitiveCompactAmount(value, userCurrency, isPrivacyMode)}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            formatSensitiveCurrency(Number(value ?? 0), userCurrency, isPrivacyMode),
                            String(name) === 'income' ? 'Income' : 'Expense',
                          ]}
                          labelFormatter={(label) => String(label)}
                        />
                        <Area
                          type="monotone"
                          dataKey="income"
                          stroke={chartColors.income}
                          strokeWidth={2}
                          fill="url(#incomeFill)"
                        />
                        <Area
                          type="monotone"
                          dataKey="expense"
                          stroke={chartColors.expense}
                          strokeWidth={2}
                          fill="url(#expenseFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="feature-card rounded-2xl border border-border p-5">
                  <div className="dashboard-calendar mt-3">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="w-full bg-transparent p-0"
                    />
                  </div>
                  <p className="mt-4 text-xs opacity-70">
                    Top expense: {formatSensitiveText(stats.topExpenseCategoryLabel, isPrivacyMode)}
                  </p>
                  <p className="mt-1 text-xs opacity-70">Currency: {userCurrency}</p>
                </div>
              </div>

              <div className="feature-card rounded-2xl border border-border p-5">
                <p className="text-xs font-medium uppercase tracking-wide opacity-60">Recent transactions</p>
                <div className="mt-3">
                  <DataTable
                    columns={recentTransactionColumns}
                    data={stats.recentTransactions}
                    showToolbar={false}
                    emptyMessage="No transactions yet."
                    initialSorting={[{ id: 'happenedAt', desc: true }]}
                  />
                </div>
              </div>
            </>
          ) : null}
        </section>
      </main>
  )
}

interface RecentTransactionRow {
  id: number
  title: string
  amount: string
  type: string
  happenedAt: string
  happenedAtLabel: string
}

interface DashboardStatsInput {
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

interface DashboardStatsOutput {
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
  recentTransactions: Array<{
    id: number
    title: string
    amount: string
    type: string
    happenedAt: string
    happenedAtLabel: string
  }>
  weeklyTrend: Array<{
    week: string
    income: number
    expense: number
  }>
  calendar: {
    monthLabel: string
  }
}

interface InsightMiniCardProps {
  icon: React.ReactNode
  label: string
  value: string
  isSensitive?: boolean
}

function InsightMiniCard({ icon, label, value, isSensitive = false }: InsightMiniCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold leading-none">
        {isSensitive ? <SensitiveText text={value} /> : value}
      </p>
    </div>
  )
}

/**
 * Builds aggregate metrics for the dashboard view.
 */
function buildDashboardStats({
  transactions,
  categories,
  savings,
  wishlist,
  goals,
  dateRange,
}: DashboardStatsInput): DashboardStatsOutput {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + parseAmount(transaction.amount), 0)

  const totalExpense = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + parseAmount(transaction.amount), 0)

  const expenseByCategoryId = transactions.reduce<Record<number, number>>((accumulator, transaction) => {
    if (transaction.type !== 'expense' || transaction.categoryId === null) return accumulator

    const currentAmount = accumulator[transaction.categoryId] ?? 0
    return {
      ...accumulator,
      [transaction.categoryId]: currentAmount + parseAmount(transaction.amount),
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
      happenedAtLabel: formatTransactionDate(transaction.happenedAt),
    }))

  const personalCategoryCount = categories.filter((category) => Boolean(category.userId)).length
  const globalCategoryCount = categories.length - personalCategoryCount
  const totalSaved = savings.reduce((sum, item) => sum + parseAmount(item.amount), 0)
  const totalWishlistTarget = wishlist.reduce((sum, item) => sum + parseAmount(item.targetAmount), 0)
  const totalGoalTarget = goals.reduce((sum, item) => sum + parseAmount(item.targetAmount), 0)
  const weeklyTrend = buildTrendSeriesForDateRange(transactions, dateRange.from, dateRange.to, parseAmount)
  const calendar = {
    monthLabel: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date()),
  }

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
  }
}

/**
 * Safely converts API amount values to numbers.
 */
function parseAmount(amount: string): number {
  const parsedAmount = Number(amount)
  if (Number.isNaN(parsedAmount)) return 0
  return parsedAmount
}

/**
 * Formats transaction dates for dashboard table rows.
 */
function formatTransactionDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

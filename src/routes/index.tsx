import { authClient } from '#/lib/auth-client'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { Calendar } from '#/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useCategoriesQuery } from '#/features/categories/hooks/use-categories'
import { useTransactionsQuery } from '#/features/transactions/hooks/use-transactions'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useState } from 'react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [trendRange, setTrendRange] = useState('6w')
  const { data: session, isPending } = authClient.useSession()
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

  if (isPending) {
    return (
      <div className="p-8">
        <p>Loading session...</p>
      </div>
    )
  }

  if (!session?.user) {
    return <Navigate to="/sign-in" />
  }

  const trendBucketCount = getTrendBucketCount(trendRange)
  const stats = buildDashboardStats({ transactions, categories, trendBucketCount })
  const isStatsPending = isTransactionsPending || isCategoriesPending
  const statsError = isTransactionsError ? transactionsError : isCategoriesError ? categoriesError : null
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
      <main className="p-6 md:p-8">
        <section className="space-y-6">
          {isStatsPending ? <p className="text-sm">Loading stats...</p> : null}
          {statsError ? <p className="text-sm text-red-600">{statsError.message}</p> : null}

          {!isStatsPending && !statsError ? (
            <>
              <div className="grid auto-rows-min gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InsightMiniCard
                  icon={<Wallet className="size-4 text-slate-600" />}
                  label="Total Balance"
                  value={formatCurrency(stats.balance, userCurrency)}
                />
                <InsightMiniCard
                  icon={<TrendingUp className="size-4 text-emerald-600" />}
                  label="Total Income"
                  value={formatCurrency(stats.totalIncome, userCurrency)}
                />
                <InsightMiniCard
                  icon={<TrendingDown className="size-4 text-rose-600" />}
                  label="Total Expenses"
                  value={formatCurrency(stats.totalExpense, userCurrency)}
                />
                <InsightMiniCard
                  icon={<Wallet className="size-4 text-sky-600" />}
                  label="Transactions"
                  value={String(stats.transactionCount)}
                />
              </div>

              <div className="grid items-start gap-4 xl:grid-cols-[2fr_1fr]">
                <div className="feature-card rounded-2xl border border-border p-5 xl:min-h-[460px]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xl font-semibold">Money Insight</p>
                      <p className="mt-1 text-xs opacity-70">Income vs expenses trend</p>
                    </div>
                    <Select value={trendRange} onValueChange={setTrendRange}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4w">Last 4 weeks</SelectItem>
                        <SelectItem value="6w">Last 6 weeks</SelectItem>
                        <SelectItem value="12w">Last 12 weeks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-4 h-72 w-full xl:h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.weeklyTrend}>
                        <defs>
                          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.03} />
                          </linearGradient>
                          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.03} />
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
                          tickFormatter={(value) => compactAmount(value, userCurrency)}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            formatCurrency(Number(value ?? 0), userCurrency),
                            String(name) === 'income' ? 'Income' : 'Expense',
                          ]}
                          labelFormatter={(label) => `Week ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="income"
                          stroke="#16a34a"
                          strokeWidth={2}
                          fill="url(#incomeFill)"
                        />
                        <Area
                          type="monotone"
                          dataKey="expense"
                          stroke="#8b5cf6"
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
                  <p className="mt-4 text-xs opacity-70">Top expense: {stats.topExpenseCategoryLabel}</p>
                  <p className="mt-1 text-xs opacity-70">Currency: {userCurrency}</p>
                </div>
              </div>

              <div className="feature-card rounded-2xl border border-border p-5">
                <p className="text-xs font-medium uppercase tracking-wide opacity-60">Recent transactions</p>
                {stats.recentTransactions.length ? (
                  <ul className="mt-3 space-y-2">
                    {stats.recentTransactions.map((transaction) => (
                      <li key={transaction.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{transaction.title}</p>
                          <p className="text-xs opacity-70">{transaction.type}</p>
                        </div>
                        <p className="text-sm font-medium">{formatCurrency(parseAmount(transaction.amount), userCurrency)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm opacity-70">No transactions yet.</p>
                )}
              </div>
            </>
          ) : null}
        </section>
      </main>
    </AuthenticatedAppShell>
  )
}

interface DashboardStatsInput {
  transactions: Array<{
    id: number
    title: string
    amount: string
    type: string
    categoryId: number
  }>
  categories: Array<{
    id: number
    name: string
    userId?: string | null
  }>
  trendBucketCount: number
}

interface DashboardStatsOutput {
  balance: number
  totalIncome: number
  totalExpense: number
  transactionCount: number
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
}

function InsightMiniCard({ icon, label, value }: InsightMiniCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold leading-none">{value}</p>
    </div>
  )
}

/**
 * Builds aggregate metrics for the dashboard view.
 */
function buildDashboardStats({ transactions, categories, trendBucketCount }: DashboardStatsInput): DashboardStatsOutput {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + parseAmount(transaction.amount), 0)

  const totalExpense = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + parseAmount(transaction.amount), 0)

  const expenseByCategoryId = transactions.reduce<Record<number, number>>((accumulator, transaction) => {
    if (transaction.type !== 'expense') return accumulator

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
    .slice(0, 5)
    .map((transaction) => ({
      id: transaction.id,
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
    }))

  const personalCategoryCount = categories.filter((category) => Boolean(category.userId)).length
  const globalCategoryCount = categories.length - personalCategoryCount
  const weeklyTrend = buildWeeklyTrendSeries(transactions, trendBucketCount)
  const calendar = {
    monthLabel: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date()),
  }

  return {
    balance: totalIncome - totalExpense,
    totalIncome,
    totalExpense,
    transactionCount: transactions.length,
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
 * Aggregates transactions into the last six weekly buckets for charting.
 */
function buildWeeklyTrendSeries(
  transactions: Array<{ amount: string; type: string }>,
  bucketCount: number
): Array<{ week: string; income: number; expense: number }> {
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    week: `W${index + 1}`,
    income: 0,
    expense: 0,
  }))

  if (!transactions.length) return buckets

  transactions.forEach((transaction, index) => {
    const bucketIndex = index % bucketCount
    const amount = Math.max(parseAmount(transaction.amount), 0)
    if (transaction.type === 'income') buckets[bucketIndex].income += amount
    if (transaction.type === 'expense') buckets[bucketIndex].expense += amount
  })

  return buckets
}

function getTrendBucketCount(range: string): number {
  if (range === '4w') return 4
  if (range === '12w') return 12
  return 6
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
 * Formats numbers into INR currency strings for dashboard metrics.
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function compactAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { PageEmptyState, PageErrorState, AnalyticsLoadingSkeleton, SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { useCategoriesQuery } from '#/features/categories/hooks/use-categories'
import { dashboardDateRangeStore } from '#/features/dashboard/store/dashboard-date-range-store'
import { buildTrendSeriesForDateRange, isDateInRange } from '#/features/dashboard/utils/dashboard-date-range'
import { useTransactionsQuery } from '#/features/transactions/hooks/use-transactions'
import { useAuthSession } from '#/lib/use-auth-session'
import { DEFAULT_CURRENCY } from '#/lib/currency'
import { StatCard } from '#/components/feedback/stat-card'
import { SensitiveText } from '#/components/privacy/sensitive-text'
import { formatSensitiveCompactAmount, formatSensitiveCurrency, formatSensitiveText, usePrivacyModeEnabled } from '#/lib/privacy/sensitive-format'
import { chartColors } from '#/lib/chart-colors'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { format, parseISO } from 'date-fns'
import { TrendingDown, TrendingUp, Wallet, ReceiptText } from 'lucide-react'
import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsPage,
})


function AnalyticsPage() {
  const { data: session, isInitialPending: isSessionPending } = useAuthSession()

  if (isSessionPending) return <SessionLoadingSkeleton />
  if (!session?.user) return <Navigate to="/sign-in" />

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
      <AnalyticsContent userCurrency={(session.user as { currency?: string }).currency ?? DEFAULT_CURRENCY} />
    </AuthenticatedAppShell>
  )
}

function AnalyticsContent({ userCurrency }: { userCurrency: string }) {
  const dateRange = useStore(dashboardDateRangeStore, (state) => state)
  const { data: transactions = [], isPending, isError, error } = useTransactionsQuery()
  const { data: categories = [] } = useCategoriesQuery()
  const currency = userCurrency.toUpperCase()
  const isPrivacyMode = usePrivacyModeEnabled()

  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => isDateInRange(transaction.happenedAt, dateRange.from, dateRange.to)),
    [transactions, dateRange.from, dateRange.to],
  )

  const stats = useMemo(() => buildAnalyticsStats(filteredTransactions), [filteredTransactions])
  const trendData = useMemo(
    () => buildTrendSeriesForDateRange(filteredTransactions, dateRange.from, dateRange.to, parseAmount),
    [filteredTransactions, dateRange.from, dateRange.to],
  )
  const topCategories = useMemo(
    () => buildTopCategories(filteredTransactions, categories),
    [filteredTransactions, categories],
  )
  const topTitles = useMemo(() => buildTopTitles(filteredTransactions), [filteredTransactions])
  const categoryChartData = useMemo(
    () =>
      topCategories.map((row, index) => ({
        name: row.label,
        amount: row.amount,
        color: chartColors.series[index % chartColors.series.length],
      })),
    [topCategories],
  )

  const dateRangeLabel = `${format(parseISO(dateRange.from), 'MMM d, yyyy')} – ${format(parseISO(dateRange.to), 'MMM d, yyyy')}`
  const hasExpenseData = stats.expense > 0

  return (
    <main className="p-6 md:p-8">
      <section className="space-y-6">
        <div className="island-shell rounded-2xl p-6">
          <h1 className="display-title text-3xl">Analytics</h1>
          <p className="mt-2 text-sm opacity-70">
            Spending insights for <span className="font-medium text-foreground">{dateRangeLabel}</span>. Use the date
            range in the top bar to filter workspace data.
          </p>
        </div>

        {isPending ? <AnalyticsLoadingSkeleton /> : null}
        {isError ? (
          <div className="island-shell rounded-2xl p-6">
            <PageErrorState message={error.message} />
          </div>
        ) : null}

        {!isPending && !isError ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                icon={<TrendingUp className="size-4 text-emerald-600" />}
                label="Income"
                value={formatSensitiveCurrency(stats.income, currency, isPrivacyMode)}
                isSensitive
              />
              <StatCard
                icon={<TrendingDown className="size-4 text-rose-600" />}
                label="Expenses"
                value={formatSensitiveCurrency(stats.expense, currency, isPrivacyMode)}
                isSensitive
              />
              <StatCard
                icon={<Wallet className="size-4 text-slate-600" />}
                label="Net"
                value={formatSensitiveCurrency(stats.net, currency, isPrivacyMode)}
                isSensitive
              />
              <StatCard
                icon={<ReceiptText className="size-4 text-sky-600" />}
                label="Transactions"
                value={String(stats.count)}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
              <div className="feature-card rounded-2xl border border-border p-5">
                <p className="text-sm font-semibold">Cash flow</p>
                <p className="mt-1 text-xs opacity-70">Income vs expenses over the selected range</p>
                <div className="mt-4 h-72">
                  {trendData.some((point) => point.income > 0 || point.expense > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="analyticsIncomeFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.income} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={chartColors.income} stopOpacity={0.03} />
                          </linearGradient>
                          <linearGradient id="analyticsExpenseFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.expense} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={chartColors.expense} stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) => formatSensitiveCompactAmount(Number(value), currency, isPrivacyMode)}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            formatSensitiveCurrency(Number(value ?? 0), currency, isPrivacyMode),
                            String(name) === 'income' ? 'Income' : 'Expense',
                          ]}
                        />
                        <Area type="monotone" dataKey="income" stroke={chartColors.income} strokeWidth={2} fill="url(#analyticsIncomeFill)" />
                        <Area type="monotone" dataKey="expense" stroke={chartColors.expense} strokeWidth={2} fill="url(#analyticsExpenseFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <PageEmptyState message="No cash flow in this date range." />
                    </div>
                  )}
                </div>
              </div>

              <div className="feature-card rounded-2xl border border-border p-5">
                <p className="text-sm font-semibold">Expense by category</p>
                <p className="mt-1 text-xs opacity-70">Where your spending went</p>
                <div className="mt-4 h-72">
                  {categoryChartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryChartData} dataKey="amount" nameKey="name" outerRadius={100} label={(entry) => entry.name}>
                          {categoryChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatSensitiveCurrency(Number(value ?? 0), currency, isPrivacyMode)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <PageEmptyState message="No expense categories yet." />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {hasExpenseData ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <InsightTable title="Top categories" rows={topCategories} currency={currency} colors={[...chartColors.series]} isPrivacyMode={isPrivacyMode} />
                <InsightTable title="Top expense titles" rows={topTitles} currency={currency} colors={[...chartColors.series]} isPrivacyMode={isPrivacyMode} />
              </div>
            ) : (
              <div className="island-shell rounded-2xl p-6">
                <PageEmptyState message="No expense data in this date range. Log expenses to see category and title breakdowns." />
              </div>
            )}

            {stats.income > 0 ? (
              <div className="feature-card rounded-2xl border border-border p-5">
                <p className="text-sm font-semibold">Income sources</p>
                <p className="mt-1 text-xs opacity-70">Top income entries in this range</p>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buildTopIncome(filteredTransactions)} layout="vertical" margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={(value) => formatSensitiveCompactAmount(Number(value), currency, isPrivacyMode)} />
                      <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} tickFormatter={(value) => formatSensitiveText(String(value), isPrivacyMode)} />
                      <Tooltip formatter={(value) => formatSensitiveCurrency(Number(value ?? 0), currency, isPrivacyMode)} />
                      <Bar dataKey="amount" radius={[0, 8, 8, 0]} fill={chartColors.income} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}

interface InsightTableProps {
  title: string
  rows: Array<{ label: string; amount: number }>
  currency: string
  colors: string[]
  isPrivacyMode: boolean
}

function InsightTable({ title, rows, currency, colors, isPrivacyMode }: InsightTableProps) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0)

  return (
    <div className="feature-card rounded-2xl border border-border p-5">
      <p className="text-sm font-semibold">{title}</p>
      {rows.length ? (
        <ul className="mt-4 space-y-3">
          {rows.map((row, index) => {
            const share = total > 0 ? (row.amount / total) * 100 : 0
            const color = colors[index % colors.length]

            return (
              <li key={row.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <SensitiveText text={row.label} className="font-medium" />
                  <span className="shrink-0 font-medium">{formatSensitiveCurrency(row.amount, currency, isPrivacyMode)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color }} />
                  </div>
                  <span className="w-10 text-right text-xs opacity-70">{share.toFixed(0)}%</span>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm opacity-70">No data yet.</p>
      )}
    </div>
  )
}

function buildAnalyticsStats(transactions: Array<{ amount: string; type: string }>) {
  return transactions.reduce(
    (accumulator, transaction) => {
      const amount = Number(transaction.amount)
      if (!Number.isFinite(amount)) return accumulator

      if (transaction.type === 'income') accumulator.income += amount
      if (transaction.type === 'expense') accumulator.expense += amount
      if (transaction.type === 'transfer') accumulator.transfer += amount
      accumulator.count += 1
      accumulator.net = accumulator.income - accumulator.expense
      return accumulator
    },
    { income: 0, expense: 0, transfer: 0, net: 0, count: 0 },
  )
}

function buildTopCategories(
  transactions: Array<{ amount: string; type: string; categoryId: number | null }>,
  categories: Array<{ id: number; name: string }>,
) {
  const totals = transactions.reduce<Record<number, number>>((accumulator, transaction) => {
    if (transaction.type !== 'expense' || transaction.categoryId === null) return accumulator
    const amount = Number(transaction.amount)
    if (!Number.isFinite(amount)) return accumulator
    accumulator[transaction.categoryId] = (accumulator[transaction.categoryId] ?? 0) + amount
    return accumulator
  }, {})

  return Object.entries(totals)
    .map(([categoryId, amount]) => ({
      label: categories.find((category) => category.id === Number(categoryId))?.name ?? 'Unknown',
      amount,
    }))
    .sort((first, second) => second.amount - first.amount)
    .slice(0, 8)
}

function buildTopTitles(transactions: Array<{ amount: string; type: string; title: string }>) {
  const totals = transactions.reduce<Record<string, number>>((accumulator, transaction) => {
    if (transaction.type !== 'expense') return accumulator
    const amount = Number(transaction.amount)
    if (!Number.isFinite(amount)) return accumulator
    accumulator[transaction.title] = (accumulator[transaction.title] ?? 0) + amount
    return accumulator
  }, {})

  return Object.entries(totals)
    .map(([label, amount]) => ({ label, amount }))
    .sort((first, second) => second.amount - first.amount)
    .slice(0, 8)
}

function buildTopIncome(transactions: Array<{ amount: string; type: string; title: string }>) {
  const totals = transactions.reduce<Record<string, number>>((accumulator, transaction) => {
    if (transaction.type !== 'income') return accumulator
    const amount = Number(transaction.amount)
    if (!Number.isFinite(amount)) return accumulator
    accumulator[transaction.title] = (accumulator[transaction.title] ?? 0) + amount
    return accumulator
  }, {})

  return Object.entries(totals)
    .map(([label, amount]) => ({ label, amount }))
    .sort((first, second) => second.amount - first.amount)
    .slice(0, 6)
}

function parseAmount(amount: string): number {
  const parsedAmount = Number(amount)
  if (!Number.isFinite(parsedAmount)) return 0
  return parsedAmount
}


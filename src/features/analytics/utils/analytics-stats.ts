import { parseLedgerAmount } from '#/features/shared/utils/amount'

export interface AnalyticsTotals {
  income: number
  expense: number
  transfer: number
  net: number
  count: number
}

export interface AnalyticsInsightRow {
  label: string
  amount: number
}

/** Aggregates income, expense, transfer, and net for analytics cards. */
export function buildAnalyticsStats(transactions: Array<{ amount: string; type: string }>): AnalyticsTotals {
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

/** Top expense categories by amount in the selected range. */
export function buildTopCategories(
  transactions: Array<{ amount: string; type: string; categoryId: number | null }>,
  categories: Array<{ id: number; name: string }>,
): AnalyticsInsightRow[] {
  const totals = transactions.reduce<Record<number, number>>((accumulator, transaction) => {
    if (transaction.type !== 'expense' || transaction.categoryId === null) return accumulator
    const amount = parseLedgerAmount(transaction.amount)
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

/** Top expense titles by amount in the selected range. */
export function buildTopTitles(transactions: Array<{ amount: string; type: string; title: string }>): AnalyticsInsightRow[] {
  const totals = transactions.reduce<Record<string, number>>((accumulator, transaction) => {
    if (transaction.type !== 'expense') return accumulator
    const amount = parseLedgerAmount(transaction.amount)
    accumulator[transaction.title] = (accumulator[transaction.title] ?? 0) + amount
    return accumulator
  }, {})

  return Object.entries(totals)
    .map(([label, amount]) => ({ label, amount }))
    .sort((first, second) => second.amount - first.amount)
    .slice(0, 8)
}

/** Top income sources by amount in the selected range. */
export function buildTopIncome(transactions: Array<{ amount: string; type: string; title: string }>): AnalyticsInsightRow[] {
  const totals = transactions.reduce<Record<string, number>>((accumulator, transaction) => {
    if (transaction.type !== 'income') return accumulator
    const amount = parseLedgerAmount(transaction.amount)
    accumulator[transaction.title] = (accumulator[transaction.title] ?? 0) + amount
    return accumulator
  }, {})

  return Object.entries(totals)
    .map(([label, amount]) => ({ label, amount }))
    .sort((first, second) => second.amount - first.amount)
    .slice(0, 6)
}

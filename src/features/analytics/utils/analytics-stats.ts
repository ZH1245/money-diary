import {
  buildPaymentAccountBalances,
  type PaymentAccountBalanceTransaction,
} from '#/features/payment-accounts/utils/payment-account-balance'
import type { PaymentAccountDto } from '#/features/payment-accounts/types/payment-account'
import { buildSavingsPageStats } from '#/features/savings/utils/savings-stats'
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

export interface CategoryExpenseGroup {
  categoryId: number | null
  label: string
  total: number
  transactions: Array<{
    title: string
    amount: number
    happenedAt: string
  }>
}

/** Groups expense transactions by category for analytics breakdowns. */
export function buildCategoryExpenseGroups(
  transactions: Array<{
    title: string
    amount: string
    type: string
    categoryId: number | null
    happenedAt: string
  }>,
  categories: Array<{ id: number; name: string }>,
): CategoryExpenseGroup[] {
  const groups = new Map<string, CategoryExpenseGroup>()

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') {
      continue
    }

    const amount = parseLedgerAmount(transaction.amount)
    const label =
      transaction.categoryId == null
        ? 'Uncategorized'
        : (categories.find((category) => category.id === transaction.categoryId)?.name ?? 'Unknown')
    const key = transaction.categoryId == null ? 'uncategorized' : String(transaction.categoryId)

    const existing = groups.get(key) ?? {
      categoryId: transaction.categoryId,
      label,
      total: 0,
      transactions: [],
    }

    existing.total += amount
    existing.transactions.push({
      title: transaction.title,
      amount,
      happenedAt: transaction.happenedAt,
    })
    groups.set(key, existing)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      transactions: [...group.transactions].sort(
        (first, second) => new Date(second.happenedAt).getTime() - new Date(first.happenedAt).getTime(),
      ),
    }))
    .sort((first, second) => second.total - first.total)
}

export interface NetWorthBreakdown {
  accountBalancesTotal: number
  savingsLedgerTotal: number
  netWorth: number
}

/**
 * Net worth = payment account balances (assets minus credit owed) + savings ledger.
 * Account balances already reflect linked savings movements on each account.
 */
export function buildNetWorth({
  accountIds,
  transactions,
  savings,
}: {
  accountIds: number[]
  transactions: PaymentAccountBalanceTransaction[]
  savings: Array<{
    amount: string
    paymentAccountId: number | null
    entryType?: 'deposit' | 'withdrawal'
    goalId?: number | null
  }>
}): NetWorthBreakdown {
  const balances = buildPaymentAccountBalances({
    accountIds,
    transactions,
    savings,
  })
  const accountBalancesTotal = Object.values(balances).reduce((sum, balance) => sum + balance, 0)
  const savingsLedgerTotal = buildSavingsPageStats(
    savings.map((entry) => ({
      amount: entry.amount,
      goalId: entry.goalId ?? null,
      entryType: entry.entryType,
    })),
  ).totalSaved

  return {
    accountBalancesTotal,
    savingsLedgerTotal,
    netWorth: accountBalancesTotal + savingsLedgerTotal,
  }
}

export interface RangeSavingsRate {
  percent: number
  hint: string
}

/**
 * Savings rate for a date range: deposits vs income when logged, else income minus spending.
 */
export function buildRangeSavingsRate(
  income: number,
  expense: number,
  savingsInRange: Array<{ amount: string; goalId: number | null; entryType?: 'deposit' | 'withdrawal' }>,
): RangeSavingsRate {
  if (income <= 0) {
    return { percent: 0, hint: 'No income in this range' }
  }

  const deposits = buildSavingsPageStats(savingsInRange).totalDeposits
  if (deposits > 0) {
    return {
      percent: Math.min(100, (deposits / income) * 100),
      hint: 'Savings deposited vs income this range',
    }
  }

  return {
    percent: Math.max(0, ((income - expense) / income) * 100),
    hint: 'Income kept after spending this range',
  }
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

/** Top expense payment accounts by spend in the selected range. */
export function buildSpendingByPaymentAccount(
  transactions: Array<{ amount: string; type: string; paymentAccountId: number | null }>,
  accounts: PaymentAccountDto[],
  resolveLabel: (account: PaymentAccountDto) => string,
  limit = 5,
): AnalyticsInsightRow[] {
  const totals = transactions.reduce<Record<number, number>>((accumulator, transaction) => {
    if (transaction.type !== 'expense' || transaction.paymentAccountId === null) {
      return accumulator
    }

    const amount = parseLedgerAmount(transaction.amount)
    accumulator[transaction.paymentAccountId] =
      (accumulator[transaction.paymentAccountId] ?? 0) + amount
    return accumulator
  }, {})

  return Object.entries(totals)
    .map(([accountId, amount]) => {
      const account = accounts.find((entry) => entry.id === Number(accountId))
      const label = account
        ? resolveLabel(account)
        : `Account #${accountId}`
      return { label, amount }
    })
    .sort((first, second) => second.amount - first.amount)
    .slice(0, limit)
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

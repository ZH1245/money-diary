import { isDateInRange } from '#/features/dashboard/utils/dashboard-date-range'
import { getVisibleCategoriesForUser } from '#/features/categories/server/categories-repository'
import { getUserTransactions } from '#/features/transactions/server/transactions-repository'
import { format, parseISO, startOfMonth, startOfWeek, subDays } from 'date-fns'

type FinanceFocus = 'expense' | 'income' | 'all'

interface BuildFinanceSummaryInput {
  userId: string
  currency: string
  from: string
  to: string
  question?: string
}

/**
 * Returns true when the user is asking to read finances, not log a new entry.
 */
export function isFinanceReadQuestion(content: string): boolean {
  const normalized = content.trim().toLowerCase()
  if (!normalized) return false

  if (isPrimarilyLegalQuestionLike(normalized)) return false

  const hasReadIntent =
    /what are my|how much (did i|have i)|show my|list my|tell me my|my (expenses?|spending|income)|total (expenses?|spending|income)|expenses? for|spending for|spent (this|last)|income for/.test(
      normalized,
    )
  const hasWriteIntent =
    /spent \d|paid \d|log |add |create |record |saved \d|transfer \d|bought /.test(normalized)

  return hasReadIntent && !hasWriteIntent
}

/**
 * Avoid treating legal/data-policy questions as finance reads.
 */
function isPrimarilyLegalQuestionLike(normalized: string): boolean {
  return /privacy|terms|policy|policies|delete (my )?(account|data)|gdpr/.test(normalized)
}

/**
 * Resolves a date range from natural language using server calendar today.
 */
export function resolveFinanceQuestionDateRange(question: string, today: string): { from: string; to: string } {
  const normalized = question.trim().toLowerCase()
  const todayDate = parseISO(today)

  if (/today/.test(normalized)) {
    return { from: today, to: today }
  }

  if (/yesterday/.test(normalized)) {
    const yesterday = format(subDays(todayDate, 1), 'yyyy-MM-dd')
    return { from: yesterday, to: yesterday }
  }

  if (/this week|weekly/.test(normalized)) {
    return {
      from: format(startOfWeek(todayDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: today,
    }
  }

  if (/last 7 days|past week/.test(normalized)) {
    return { from: format(subDays(todayDate, 6), 'yyyy-MM-dd'), to: today }
  }

  if (/last 30 days|past month/.test(normalized)) {
    return { from: format(subDays(todayDate, 29), 'yyyy-MM-dd'), to: today }
  }

  if (/this month|for the month|monthly|month/.test(normalized)) {
    return { from: format(startOfMonth(todayDate), 'yyyy-MM-dd'), to: today }
  }

  return { from: format(startOfMonth(todayDate), 'yyyy-MM-dd'), to: today }
}

/**
 * Detects whether the question is mainly about expenses, income, or both.
 */
function resolveFinanceFocus(question: string | undefined): FinanceFocus {
  const normalized = (question ?? '').toLowerCase()
  if (/income|salary|earned/.test(normalized) && !/expense|spent|spending/.test(normalized)) {
    return 'income'
  }
  if (/expense|spent|spending/.test(normalized)) {
    return 'expense'
  }
  return 'all'
}

/**
 * Parses a stored amount string into a number.
 */
function parseAmount(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

/**
 * Formats a ledger amount for user-facing summaries.
 */
function formatLedgerAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

/**
 * Builds a plain-language spending/income summary for the authenticated user.
 */
export async function buildFinanceSummaryAnswer({
  userId,
  currency,
  from,
  to,
  question,
}: BuildFinanceSummaryInput): Promise<string> {
  const focus = resolveFinanceFocus(question)
  const [transactions, categories] = await Promise.all([
    getUserTransactions(userId),
    getVisibleCategoriesForUser(userId),
  ])

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const inRange = transactions.filter((transaction) =>
    isDateInRange(transaction.happenedAt.toISOString(), from, to),
  )

  const expenses = inRange.filter((transaction) => transaction.type === 'expense')
  const incomes = inRange.filter((transaction) => transaction.type === 'income')
  const transfers = inRange.filter((transaction) => transaction.type === 'transfer')

  const totalExpense = expenses.reduce((sum, row) => sum + parseAmount(row.amount), 0)
  const totalIncome = incomes.reduce((sum, row) => sum + parseAmount(row.amount), 0)
  const totalTransfer = transfers.reduce((sum, row) => sum + parseAmount(row.amount), 0)

  const expenseByCategory = expenses.reduce<Record<number, number>>((accumulator, transaction) => {
    if (transaction.categoryId == null) return accumulator
    accumulator[transaction.categoryId] =
      (accumulator[transaction.categoryId] ?? 0) + parseAmount(transaction.amount)
    return accumulator
  }, {})

  const topCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoryId, amount]) => ({
      name: categoryNames.get(Number(categoryId)) ?? 'Uncategorized',
      amount,
    }))

  const rangeLabel = `${format(parseISO(from), 'MMM d, yyyy')} – ${format(parseISO(to), 'MMM d, yyyy')}`
  const lines: string[] = []

  if (focus === 'expense' || focus === 'all') {
    if (expenses.length === 0) {
      lines.push(`No expenses recorded for ${rangeLabel}.`)
    } else {
      lines.push(
        `Expenses for ${rangeLabel}: ${formatLedgerAmount(totalExpense, currency)} across ${expenses.length} transaction${expenses.length === 1 ? '' : 's'}.`,
      )
      if (topCategories.length > 0) {
        lines.push('Top categories:')
        for (const entry of topCategories) {
          lines.push(`- ${entry.name}: ${formatLedgerAmount(entry.amount, currency)}`)
        }
      }
    }
  }

  if (focus === 'income' || focus === 'all') {
    if (incomes.length === 0) {
      lines.push(`No income recorded for ${rangeLabel}.`)
    } else {
      lines.push(
        `Income for ${rangeLabel}: ${formatLedgerAmount(totalIncome, currency)} across ${incomes.length} transaction${incomes.length === 1 ? '' : 's'}.`,
      )
    }
  }

  if (focus === 'all' && (totalIncome > 0 || totalExpense > 0)) {
    const net = totalIncome - totalExpense
    lines.push(`Net (income minus expenses): ${formatLedgerAmount(net, currency)}`)
  }

  if (focus === 'all' && transfers.length > 0) {
    lines.push(
      `Transfers in this period: ${formatLedgerAmount(totalTransfer, currency)} (${transfers.length} transaction${transfers.length === 1 ? '' : 's'}).`,
    )
  }

  lines.push('Open Transactions or Analytics for the full list.')
  return lines.join('\n')
}

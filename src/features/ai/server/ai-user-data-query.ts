import { isDateInRange } from '#/features/dashboard/utils/dashboard-date-range'
import { getVisibleCategoriesForUser } from '#/features/categories/server/categories-repository'
import { getUserGoals } from '#/features/goals/server/goals-repository'
import { getUserSavings } from '#/features/savings/server/savings-repository'
import { getSavingLedgerDelta, type SavingEntryType } from '#/features/savings/utils/saving-ledger'
import { getUserTransactions } from '#/features/transactions/server/transactions-repository'
import { getUserWishlistItems } from '#/features/wishlist/server/wishlist-repository'
import { format, parseISO } from 'date-fns'

/** Default row cap for AI data reads; totals still reflect the full filtered set. */
export const DEFAULT_QUERY_USER_DATA_LIMIT = 20

interface QueryUserDataInput {
  userId: string
  currency: string
  dataset: 'transactions' | 'savings' | 'goals' | 'wishlist'
  fromDate: string
  toDate: string
  transactionType: 'expense' | 'income' | 'transfer' | 'all'
  groupBy: 'none' | 'date' | 'category'
  limit: number
}

/**
 * Runs a flexible user-data read and returns a plain-language answer.
 */
export async function queryUserData(input: QueryUserDataInput): Promise<string> {
  if (input.dataset === 'transactions') {
    return queryTransactions(input)
  }
  if (input.dataset === 'savings') {
    return querySavings(input)
  }
  if (input.dataset === 'goals') {
    return queryGoals(input)
  }
  return queryWishlist(input)
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

function formatRangeLabel(from: string, to: string): string {
  return `${format(parseISO(from), 'MMM d, yyyy')} – ${format(parseISO(to), 'MMM d, yyyy')}`
}

function formatTruncationNote(shown: number, total: number): string {
  return `\nShowing newest ${shown} of ${total} entries. Totals above include all ${total} matches.`
}

/**
 * Reads and formats transaction data with optional grouping.
 */
async function queryTransactions(input: QueryUserDataInput): Promise<string> {
  const [transactions, categories] = await Promise.all([
    getUserTransactions(input.userId),
    getVisibleCategoriesForUser(input.userId),
  ])

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const rangeLabel = formatRangeLabel(input.fromDate, input.toDate)

  let rows = transactions.filter((transaction) =>
    isDateInRange(transaction.happenedAt.toISOString(), input.fromDate, input.toDate),
  )

  if (input.transactionType !== 'all') {
    rows = rows.filter((transaction) => transaction.type === input.transactionType)
  }

  rows.sort((a, b) => b.happenedAt.getTime() - a.happenedAt.getTime())

  if (rows.length === 0) {
    return `No transactions found for ${rangeLabel}.`
  }

  if (input.groupBy === 'category') {
    const totals = rows.reduce<Record<number, number>>((accumulator, transaction) => {
      const key = transaction.categoryId ?? -1
      accumulator[key] = (accumulator[key] ?? 0) + parseAmount(transaction.amount)
      return accumulator
    }, {})

    const typeLabel = input.transactionType === 'all' ? 'transactions' : `${input.transactionType}s`
    const grandTotal = rows.reduce((sum, row) => sum + parseAmount(row.amount), 0)
    const lines = [
      `${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)} for ${rangeLabel}: ${formatLedgerAmount(grandTotal, input.currency)} across ${rows.length} entries.`,
      'By category:',
    ]

    for (const [categoryId, amount] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
      const name = Number(categoryId) === -1 ? 'Uncategorized' : categoryNames.get(Number(categoryId)) ?? 'Unknown'
      lines.push(`- ${name}: ${formatLedgerAmount(amount, input.currency)}`)
    }

    return lines.join('\n')
  }

  if (input.groupBy === 'date') {
    const grandTotal = rows.reduce((sum, row) => sum + parseAmount(row.amount), 0)
    const limitedRows = rows.slice(0, input.limit)
    const byDate = new Map<string, typeof rows>()

    for (const row of limitedRows) {
      const day = format(row.happenedAt, 'yyyy-MM-dd')
      const bucket = byDate.get(day) ?? []
      bucket.push(row)
      byDate.set(day, bucket)
    }

    const lines = [
      `Transactions by date (${rangeLabel}): ${formatLedgerAmount(grandTotal, input.currency)} across ${rows.length} entries.`,
    ]

    if (rows.length > input.limit) {
      lines.push(`Newest ${input.limit} rows:`)
    }

    for (const day of [...byDate.keys()].sort((a, b) => b.localeCompare(a))) {
      const dayRows = byDate.get(day) ?? []
      const dayTotal = dayRows.reduce((sum, row) => sum + parseAmount(row.amount), 0)
      lines.push(`\n${format(parseISO(day), 'MMM d, yyyy')} — ${formatLedgerAmount(dayTotal, input.currency)}`)
      for (const row of dayRows) {
        const category = row.categoryId ? categoryNames.get(row.categoryId) : null
        const categorySuffix = category ? ` (${category})` : ''
        lines.push(`  · ${row.title} [ref ${row.id}]: ${formatLedgerAmount(parseAmount(row.amount), input.currency)}${categorySuffix}`)
      }
    }

    if (rows.length > input.limit) {
      lines.push(formatTruncationNote(input.limit, rows.length))
    }

    return lines.join('\n')
  }

  const grandTotal = rows.reduce((sum, row) => sum + parseAmount(row.amount), 0)
  const typeLabel = input.transactionType === 'all' ? 'transactions' : `${input.transactionType}s`
  const lines = [
    `${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)} for ${rangeLabel}: ${formatLedgerAmount(grandTotal, input.currency)} across ${rows.length} entries.`,
  ]

  if (rows.length > input.limit) {
    lines.push(`Newest ${input.limit} rows:`)
  }

  for (const row of rows.slice(0, input.limit)) {
    const day = format(row.happenedAt, 'MMM d, yyyy')
    const category = row.categoryId ? categoryNames.get(row.categoryId) : null
    const categorySuffix = category ? ` · ${category}` : ''
    lines.push(
      `- ${day}: ${row.title} [ref ${row.id}] — ${formatLedgerAmount(parseAmount(row.amount), input.currency)} (${row.type})${categorySuffix}`,
    )
  }

  if (rows.length > input.limit) {
    lines.push(formatTruncationNote(input.limit, rows.length))
  }

  return lines.join('\n')
}

/**
 * Reads and formats savings entries.
 */
async function querySavings(input: QueryUserDataInput): Promise<string> {
  const rows = (await getUserSavings(input.userId))
    .filter((row) => isDateInRange(row.savedAt.toISOString(), input.fromDate, input.toDate))
    .sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime())

  const rangeLabel = formatRangeLabel(input.fromDate, input.toDate)
  if (rows.length === 0) {
    return `No savings entries for ${rangeLabel}.`
  }

  const total = rows.reduce(
    (sum, row) => sum + getSavingLedgerDelta(row.amount, (row.entryType ?? 'deposit') as SavingEntryType),
    0,
  )
  const depositTotal = rows
    .filter((row) => (row.entryType ?? 'deposit') === 'deposit')
    .reduce((sum, row) => sum + getSavingLedgerDelta(row.amount, 'deposit'), 0)
  const withdrawalTotal = rows
    .filter((row) => row.entryType === 'withdrawal')
    .reduce((sum, row) => sum + Math.abs(getSavingLedgerDelta(row.amount, 'withdrawal')), 0)

  const lines = [
    `Savings for ${rangeLabel}: net ${formatLedgerAmount(total, input.currency)} (${formatLedgerAmount(depositTotal, input.currency)} deposited, ${formatLedgerAmount(withdrawalTotal, input.currency)} withdrawn) across ${rows.length} entries.`,
  ]

  for (const row of rows.slice(0, input.limit)) {
    const entryType = (row.entryType ?? 'deposit') as SavingEntryType
    const typeLabel = entryType === 'withdrawal' ? 'withdrawal' : 'deposit'
    lines.push(
      `- ${format(row.savedAt, 'MMM d, yyyy')}: [${typeLabel}] ${row.title} — ${formatLedgerAmount(parseAmount(row.amount), input.currency)}`,
    )
  }

  if (rows.length > input.limit) {
    lines.push(formatTruncationNote(Math.min(input.limit, rows.length), rows.length))
  }

  return lines.join('\n')
}

/**
 * Reads and formats financial goals.
 */
async function queryGoals(input: QueryUserDataInput): Promise<string> {
  const rows = await getUserGoals(input.userId)
  if (rows.length === 0) {
    return 'You have no goals yet.'
  }

  const lines = ['Your goals:']
  for (const row of rows.slice(0, input.limit)) {
    lines.push(
      `- ${row.title}: ${formatLedgerAmount(parseAmount(row.currentAmount), input.currency)} / ${formatLedgerAmount(parseAmount(row.targetAmount), input.currency)} (${row.status})`,
    )
  }

  if (rows.length > input.limit) {
    lines.push(formatTruncationNote(Math.min(input.limit, rows.length), rows.length))
  }

  return lines.join('\n')
}

/**
 * Reads and formats wishlist items.
 */
async function queryWishlist(input: QueryUserDataInput): Promise<string> {
  const rows = (await getUserWishlistItems(input.userId)).filter((row) => row.status === 'active')
  if (rows.length === 0) {
    return 'Your wishlist is empty.'
  }

  const lines = ['Your wishlist:']
  for (const row of rows.slice(0, input.limit)) {
    lines.push(
      `- ${row.title}: target ${formatLedgerAmount(parseAmount(row.targetAmount), input.currency)} (${row.priority} priority)`,
    )
  }

  if (rows.length > input.limit) {
    lines.push(formatTruncationNote(Math.min(input.limit, rows.length), rows.length))
  }

  return lines.join('\n')
}

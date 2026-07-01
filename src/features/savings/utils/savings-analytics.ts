import { parseCalendarDate } from '#/lib/date-input'
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
} from 'date-fns'
import { getSavingLedgerDelta, type SavingEntryType } from '#/features/savings/utils/saving-ledger'

export interface SavingsTrendPoint {
  label: string
  deposits: number
  withdrawals: number
}

export interface SavingsGoalBreakdownRow {
  goalId: number | null
  label: string
  amount: number
}

interface SavingsTrendRow {
  amount: string
  savedAt: string
  entryType?: SavingEntryType
}

/**
 * Builds deposits vs withdrawals buckets for the savings trend chart.
 */
export function buildSavingsTrendSeries(
  savings: SavingsTrendRow[],
  from: string,
  to: string,
): SavingsTrendPoint[] {
  const fromDate = startOfDay(parseCalendarDate(from))
  const toDate = endOfDay(parseCalendarDate(to))
  const dayCount = differenceInCalendarDays(toDate, fromDate) + 1

  if (!dayCount || dayCount < 1) {
    return []
  }

  let intervalStarts: Date[]
  let labelFor: (date: Date) => string

  if (dayCount <= 14) {
    intervalStarts = eachDayOfInterval({ start: fromDate, end: toDate })
    labelFor = (date) => format(date, 'MMM d')
  } else if (dayCount <= 84) {
    intervalStarts = eachWeekOfInterval({ start: fromDate, end: toDate }, { weekStartsOn: 1 })
    labelFor = (date) => format(date, 'MMM d')
  } else {
    intervalStarts = eachMonthOfInterval({ start: fromDate, end: toDate })
    labelFor = (date) => format(date, 'MMM yy')
  }

  const buckets = intervalStarts.slice(0, 12).map((start, index) => {
    const nextStart = intervalStarts[index + 1]
    const end = nextStart ? addDays(startOfDay(nextStart), -1) : toDate

    return {
      label: labelFor(start),
      start: startOfDay(start),
      end: endOfDay(end > toDate ? toDate : end),
      deposits: 0,
      withdrawals: 0,
    }
  })

  for (const saving of savings) {
    const savedAt = new Date(saving.savedAt)
    if (Number.isNaN(savedAt.getTime())) {
      continue
    }

    const bucket = buckets.find((entry) =>
      isWithinInterval(savedAt, { start: entry.start, end: entry.end }),
    )
    if (!bucket) {
      continue
    }

    const entryType = saving.entryType ?? 'deposit'
    const amount = Math.abs(getSavingLedgerDelta(saving.amount, entryType))
    if (entryType === 'withdrawal') {
      bucket.withdrawals += amount
    } else {
      bucket.deposits += amount
    }
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    deposits: bucket.deposits,
    withdrawals: bucket.withdrawals,
  }))
}

/**
 * Groups savings ledger net amounts by linked goal for breakdown charts.
 */
export function buildSavingsByGoalBreakdown(
  savings: Array<{ amount: string; goalId: number | null; entryType?: SavingEntryType }>,
  goals: Array<{ id: number; title: string }>,
): SavingsGoalBreakdownRow[] {
  const totals = new Map<string, SavingsGoalBreakdownRow>()

  for (const saving of savings) {
    const goalId = saving.goalId
    const key = goalId === null ? 'general' : String(goalId)
    const label =
      goalId === null
        ? 'General savings'
        : (goals.find((goal) => goal.id === goalId)?.title ?? 'Linked goal')
    const delta = getSavingLedgerDelta(saving.amount, saving.entryType ?? 'deposit')

    const existing = totals.get(key)
    if (existing) {
      existing.amount += delta
    } else {
      totals.set(key, { goalId, label, amount: delta })
    }
  }

  return [...totals.values()]
    .filter((row) => row.amount > 0)
    .sort((first, second) => second.amount - first.amount)
}

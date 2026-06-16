import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns'

/**
 * Returns true when a date string falls inside the inclusive range.
 */
export function isDateInRange(value: string, from: string, to: string): boolean {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  return isWithinInterval(date, {
    start: startOfDay(parseISO(from)),
    end: endOfDay(parseISO(to)),
  })
}

/**
 * Builds chart buckets from transactions inside the selected date range.
 */
export function buildTrendSeriesForDateRange(
  transactions: Array<{ amount: string; type: string; happenedAt: string }>,
  from: string,
  to: string,
  parseAmount: (amount: string) => number,
): Array<{ week: string; income: number; expense: number }> {
  const fromDate = startOfDay(parseISO(from))
  const toDate = endOfDay(parseISO(to))
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
      income: 0,
      expense: 0,
    }
  })

  transactions.forEach((transaction) => {
    const happenedAt = new Date(transaction.happenedAt)
    if (Number.isNaN(happenedAt.getTime())) return

    const bucket = buckets.find((entry) =>
      isWithinInterval(happenedAt, {
        start: entry.start,
        end: entry.end,
      }),
    )

    if (!bucket) return

    const amount = Math.max(parseAmount(transaction.amount), 0)
    if (transaction.type === 'income') bucket.income += amount
    if (transaction.type === 'expense') bucket.expense += amount
  })

  return buckets.map((bucket) => ({
    week: bucket.label,
    income: bucket.income,
    expense: bucket.expense,
  }))
}

import { Store } from '@tanstack/react-store'
import { format, subDays } from 'date-fns'

/**
 * Dashboard date range filter state shared with the top bar.
 */
interface DashboardDateRangeState {
  from: string
  to: string
}

function getDefaultDateRange(): DashboardDateRangeState {
  const today = new Date()
  return {
    from: format(subDays(today, 29), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  }
}

/**
 * Ensures the dashboard range always has from <= to.
 */
function normalizeDateRange(range: DashboardDateRangeState): DashboardDateRangeState {
  if (range.from <= range.to) return range
  return { from: range.to, to: range.from }
}

/**
 * Applies store updates only when normalized values change.
 */
function commitDateRange(nextRange: DashboardDateRangeState) {
  dashboardDateRangeStore.setState((state) => {
    const normalizedRange = normalizeDateRange(nextRange)
    if (normalizedRange.from === state.from && normalizedRange.to === state.to) return state
    return normalizedRange
  })
}

/**
 * Central date range store for dashboard filtering.
 */
export const dashboardDateRangeStore = new Store<DashboardDateRangeState>(getDefaultDateRange())

/**
 * Updates the dashboard range start date.
 */
export function setDashboardDateFrom(from: string) {
  commitDateRange({ ...dashboardDateRangeStore.state, from })
}

/**
 * Updates the dashboard range end date.
 */
export function setDashboardDateTo(to: string) {
  commitDateRange({ ...dashboardDateRangeStore.state, to })
}

/**
 * Updates the dashboard date range in one action.
 */
export function setDashboardDateRange(range: { from: string; to: string }) {
  commitDateRange(range)
}

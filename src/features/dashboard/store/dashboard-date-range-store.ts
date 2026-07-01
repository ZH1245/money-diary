import { Store } from '@tanstack/react-store'
import { getCalendarToday, subtractCalendarDays } from '#/lib/date-input'

/**
 * Dashboard date range filter state shared with the top bar.
 */
interface DashboardDateRangeState {
  from: string
  to: string
}

const EMPTY_DATE_RANGE: DashboardDateRangeState = { from: '', to: '' }

function getDefaultDateRange(): DashboardDateRangeState {
  const today = getCalendarToday()
  return {
    from: subtractCalendarDays(today, 29),
    to: today,
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
 * Central date range store for workspace-wide filtering.
 * Initialized empty on SSR; synced to local today on the client.
 */
export const dashboardDateRangeStore = new Store<DashboardDateRangeState>(
  typeof window !== 'undefined' ? getDefaultDateRange() : EMPTY_DATE_RANGE,
)

/**
 * Initializes or repairs the range using the client's local calendar today.
 */
export function ensureDashboardDateRangeInitialized() {
  const state = dashboardDateRangeStore.state
  const today = getCalendarToday()

  if (!state.from || !state.to || state.to > today) {
    dashboardDateRangeStore.setState(() => getDefaultDateRange())
  }
}

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

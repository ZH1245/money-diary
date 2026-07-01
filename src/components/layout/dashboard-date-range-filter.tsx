import { InfoTooltip } from '#/components/forms/info-tooltip'
import { ToolbarTooltip } from '#/components/layout/toolbar-tooltip'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  dashboardDateRangeStore,
  ensureDashboardDateRangeInitialized,
  setDashboardDateRange,
} from '#/features/dashboard/store/dashboard-date-range-store'
import { buildTransactionCalendarActivity } from '#/features/dashboard/utils/transaction-calendar-activity'
import { useTransactionsQuery } from '#/features/transactions/hooks/use-transactions'
import { formatCalendarDate, parseCalendarDate } from '#/lib/date-input'
import { useStore } from '@tanstack/react-store'
import { format } from 'date-fns'
import { CalendarRange } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

/**
 * Top-bar date range picker shared across workspace pages.
 */
export function DashboardDateRangeFilter() {
  const dateRange = useStore(dashboardDateRangeStore, (state) => state)
  const { data: transactions = [] } = useTransactionsQuery()
  const [isCompact, setIsCompact] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const hasRange = Boolean(dateRange.from && dateRange.to)
  const selectedRange: DateRange | undefined = hasRange
    ? {
        from: parseCalendarDate(dateRange.from),
        to: parseCalendarDate(dateRange.to),
      }
    : undefined
  const dayActivityByDate = useMemo(
    () => buildTransactionCalendarActivity(transactions),
    [transactions],
  )

  useEffect(() => {
    ensureDashboardDateRangeInitialized()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const compactMediaQuery = window.matchMedia('(max-width: 1535px)')
    const mobileMediaQuery = window.matchMedia('(max-width: 768px)')
    const handleCompactChange = (event: MediaQueryListEvent) => setIsCompact(event.matches)
    const handleMobileChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)

    setIsCompact(compactMediaQuery.matches)
    setIsMobile(mobileMediaQuery.matches)

    compactMediaQuery.addEventListener('change', handleCompactChange)
    mobileMediaQuery.addEventListener('change', handleMobileChange)
    return () => {
      compactMediaQuery.removeEventListener('change', handleCompactChange)
      mobileMediaQuery.removeEventListener('change', handleMobileChange)
    }
  }, [])

  function handleRangeSelect(range: DateRange | undefined) {
    if (!range?.from) return

    const nextFrom = formatCalendarDate(range.from)
    const nextTo = range.to ? formatCalendarDate(range.to) : nextFrom

    if (nextFrom === dateRange.from && nextTo === dateRange.to) return

    setDashboardDateRange({ from: nextFrom, to: nextTo })
  }

  function handleDayDoubleClick(day: Date) {
    const isoDate = formatCalendarDate(day)
    setDashboardDateRange({ from: isoDate, to: isoDate })
  }

  const compactLabel = hasRange
    ? `${format(selectedRange!.from!, 'MMM d')} – ${format(selectedRange!.to!, 'MMM d')}`
    : 'Last 30 days'
  const fullLabel = hasRange
    ? `${format(selectedRange!.from!, 'MMM d, yyyy')} – ${format(selectedRange!.to!, 'MMM d, yyyy')}`
    : 'Last 30 days'
  const dateLabel = isCompact ? compactLabel : fullLabel

  return (
    <div className="flex items-center gap-0.5">
      <DropdownMenu>
        <ToolbarTooltip label={`Date range: ${fullLabel}`}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              aria-label={`Date range: ${fullLabel}`}
              className="shrink-0 gap-1.5 overflow-hidden px-2 py-2 text-xs font-normal max-w-9 sm:max-w-44 sm:px-3 md:max-w-52 lg:max-w-60 lg:gap-2 lg:px-4 xl:max-w-none"
            >
            <CalendarRange className="size-3.5 shrink-0 opacity-70" />
            <span className="hidden min-w-0 truncate sm:inline lg:max-w-36 xl:max-w-none">
              {dateLabel}
            </span>
          </Button>
          </DropdownMenuTrigger>
        </ToolbarTooltip>
        <DropdownMenuContent align="end" className="w-auto max-w-[calc(100vw-1rem)] overflow-hidden p-0">
          <div className="space-y-2 p-2">
            <Calendar
              mode="range"
              defaultMonth={selectedRange?.from}
              selected={selectedRange}
              onSelect={handleRangeSelect}
              numberOfMonths={isMobile ? 1 : 2}
              dayActivityByDate={dayActivityByDate}
              onDayDoubleClick={handleDayDoubleClick}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-2 pt-2 text-[11px] text-muted-foreground">
              <p>Double-click a date to filter one day.</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  In
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-red-500" />
                  Out
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-sky-500" />
                  Transfer
                </span>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <InfoTooltip
        label="Date range help"
        content="Click two dates to set a range. Double-click one date to filter that day only. Dots show days with income (green), expenses (red), or transfers (blue)."
      />
    </div>
  )
}

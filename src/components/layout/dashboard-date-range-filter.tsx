import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  dashboardDateRangeStore,
  setDashboardDateRange,
} from '#/features/dashboard/store/dashboard-date-range-store'
import { useStore } from '@tanstack/react-store'
import { format, parseISO } from 'date-fns'
import { CalendarRange } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { DateRange } from 'react-day-picker'

/**
 * Top-bar date range picker shared across workspace pages.
 */
export function DashboardDateRangeFilter() {
  const dateRange = useStore(dashboardDateRangeStore, (state) => state)
  const [isCompact, setIsCompact] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const selectedRange: DateRange = {
    from: parseISO(dateRange.from),
    to: parseISO(dateRange.to),
  }

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

    const nextFrom = format(range.from, 'yyyy-MM-dd')
    const nextTo = range.to ? format(range.to, 'yyyy-MM-dd') : dateRange.to

    if (nextFrom === dateRange.from && nextTo === dateRange.to) return

    setDashboardDateRange({ from: nextFrom, to: nextTo })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="max-w-38 shrink-0 gap-1.5 overflow-hidden px-3 py-2 text-xs font-normal sm:max-w-44 xl:max-w-none xl:gap-2 xl:px-4"
        >
          <CalendarRange className="size-3.5 shrink-0 opacity-70" />
          <span className="truncate">
            {isCompact
              ? `${format(selectedRange.from!, 'MMM d')} – ${format(selectedRange.to!, 'MMM d')}`
              : `${format(selectedRange.from!, 'MMM d, yyyy')} – ${format(selectedRange.to!, 'MMM d, yyyy')}`}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto max-w-[calc(100vw-1rem)] overflow-hidden p-0">
        <Calendar
          mode="range"
          defaultMonth={selectedRange.from}
          selected={selectedRange}
          onSelect={handleRangeSelect}
          numberOfMonths={isMobile ? 1 : 2}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

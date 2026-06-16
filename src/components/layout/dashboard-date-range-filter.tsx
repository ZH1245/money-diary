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
import type { DateRange } from 'react-day-picker'

/**
 * Top-bar date range picker for dashboard filtering.
 */
export function DashboardDateRangeFilter() {
  const dateRange = useStore(dashboardDateRangeStore, (state) => state)
  const selectedRange: DateRange = {
    from: parseISO(dateRange.from),
    to: parseISO(dateRange.to),
  }

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
        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-normal">
          <CalendarRange className="size-3.5 opacity-70" />
          {format(selectedRange.from!, 'MMM d, yyyy')} – {format(selectedRange.to!, 'MMM d, yyyy')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          defaultMonth={selectedRange.from}
          selected={selectedRange}
          onSelect={handleRangeSelect}
          numberOfMonths={2}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

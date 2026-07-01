"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker"

import { cn } from "#/lib/utils.ts"
import { formatCalendarDate } from "#/lib/date-input"
import { Button, buttonVariants } from "#/components/ui/button.tsx"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "#/components/ui/tooltip.tsx"
import { format } from "date-fns"

export interface DayActivityMarkers {
  income?: boolean
  expense?: boolean
  transfer?: boolean
  incomeTotal?: number
  expenseTotal?: number
  transferTotal?: number
}

interface CalendarActivityContextValue {
  dayActivityByDate?: Record<string, DayActivityMarkers>
  onDayDoubleClick?: (day: Date) => void
  currency?: string
  isPrivacyMode?: boolean
}

const CalendarActivityContext = React.createContext<CalendarActivityContextValue>({})

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  dayActivityByDate,
  onDayDoubleClick,
  currency,
  isPrivacyMode,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  dayActivityByDate?: Record<string, DayActivityMarkers>
  onDayDoubleClick?: (day: Date) => void
  currency?: string
  isPrivacyMode?: boolean
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <CalendarActivityContext.Provider value={{ dayActivityByDate, onDayDoubleClick, currency, isPrivacyMode }}>
    <TooltipProvider delayDuration={300}>
      <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-background p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label
        ),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-md"
            : "[&:first-child[data-selected=true]_button]:rounded-l-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "rounded-md bg-accent text-accent-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
    </TooltipProvider>
    </CalendarActivityContext.Provider>
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()
  const { dayActivityByDate, onDayDoubleClick, currency, isPrivacyMode } = React.useContext(CalendarActivityContext)
  const dateKey = formatCalendarDate(day.date)
  const activity = dayActivityByDate?.[dateKey]

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  function handleDoubleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    onDayDoubleClick?.(day.date)
  }

  const hasStats = currency && activity && (
    (activity.income && (activity.incomeTotal ?? 0) > 0) ||
    (activity.expense && (activity.expenseTotal ?? 0) > 0) ||
    (activity.transfer && (activity.transferTotal ?? 0) > 0)
  )

  function formatAmount(amount: number) {
    if (isPrivacyMode) return '•••'
    return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }

  const button = (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-accent-foreground [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    >
      <span>{day.date.getDate()}</span>
      {activity ? (
        <span className="flex items-center justify-center gap-0.5" aria-hidden>
          {activity.income ? <span className="size-1.5 rounded-full bg-emerald-500" /> : null}
          {activity.expense ? <span className="size-1.5 rounded-full bg-red-500" /> : null}
          {activity.transfer ? <span className="size-1.5 rounded-full bg-sky-500" /> : null}
        </span>
      ) : null}
    </Button>
  )

  if (!hasStats) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="top" className="min-w-[140px] space-y-1 p-2.5 text-xs">
        <p className="mb-1.5 font-medium opacity-80">{format(day.date, 'MMM d, yyyy')}</p>
        {activity.expense && (activity.expenseTotal ?? 0) > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-red-500" />
              Out
            </span>
            <span className="font-medium">{formatAmount(activity.expenseTotal ?? 0)}</span>
          </div>
        )}
        {activity.income && (activity.incomeTotal ?? 0) > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              In
            </span>
            <span className="font-medium">{formatAmount(activity.incomeTotal ?? 0)}</span>
          </div>
        )}
        {activity.transfer && (activity.transferTotal ?? 0) > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-sky-500" />
              Transfer
            </span>
            <span className="font-medium">{formatAmount(activity.transferTotal ?? 0)}</span>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export { Calendar, CalendarDayButton }

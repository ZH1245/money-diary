import { useStore } from '@tanstack/react-store'
import { formatCalendarDate, formatCalendarLabel, parseCalendarDate } from '#/lib/date-input'
import { getClientTimeZone } from '#/lib/timezone'
import { CalendarIcon, ListFilter, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Label } from '#/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { CategoryDto } from '#/features/categories/types/category'
import type { PaymentAccountDto } from '#/features/payment-accounts/types/payment-account'
import {
  countActiveTransactionTableFilters,
  resetTransactionTableFilters,
  setTransactionAccountFilter,
  setTransactionCategoryFilter,
  setTransactionTableDateFrom,
  setTransactionTableDateTo,
  transactionFiltersStore,
} from '#/features/transactions/store/transaction-filters-store'
import { cn } from '#/lib/utils'

interface TransactionTableFiltersProps {
  categories: CategoryDto[]
  paymentAccounts: PaymentAccountDto[]
  children: (slots: {
    toolbarStart: ReactNode
    belowToolbar: ReactNode
  }) => ReactNode
}

interface DateFilterFieldProps {
  id: string
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}

/**
 * Date filter with label for the expandable transactions filter panel.
 */
function DateFilterField({ id, label, value, placeholder, onChange }: DateFilterFieldProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = value ? parseCalendarDate(value) : undefined

  function handleSelect(date: Date | undefined) {
    if (!date) {
      return
    }

    onChange(formatCalendarDate(date))
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setOpen(false)
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              className={cn(
                'h-9 w-full justify-start gap-2 font-normal',
                value && 'pr-10',
                !value && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
              <span className="truncate">
                {value ? formatCalendarLabel(value, { includeYear: true }) : placeholder}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto max-w-[calc(100vw-1rem)] overflow-hidden p-0"
            align="start"
          >
            <Calendar
              mode="single"
              timeZone={getClientTimeZone()}
              selected={selectedDate}
              onSelect={handleSelect}
              defaultMonth={selectedDate}
            />
          </PopoverContent>
        </Popover>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 z-10 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={`Clear ${label.toLowerCase()} date`}
            onClick={handleClear}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Provides filter toggle (toolbar) and expandable filter panel (below toolbar).
 */
export function TransactionTableFilters({
  categories,
  paymentAccounts,
  children,
}: TransactionTableFiltersProps) {
  const filters = useStore(transactionFiltersStore, (state) => state)
  const [isOpen, setIsOpen] = useState(false)
  const activeCount = countActiveTransactionTableFilters(filters)

  const toolbarStart = (
    <Button
      type="button"
      variant={isOpen || activeCount > 0 ? 'secondary' : 'outline'}
      size="sm"
      className="h-8 shrink-0 gap-1.5"
      aria-expanded={isOpen}
      onClick={() => setIsOpen((open) => !open)}
    >
      <ListFilter className="size-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">Filters</span>
      {activeCount > 0 ? (
        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {activeCount}
        </span>
      ) : null}
    </Button>
  )

  const belowToolbar = isOpen ? (
    <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="transaction-filter-category" className="text-xs text-muted-foreground">
            Category
          </Label>
          <Select value={filters.categoryId} onValueChange={setTransactionCategoryFilter}>
            <SelectTrigger id="transaction-filter-category" className="h-9 w-full">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="transaction-filter-account" className="text-xs text-muted-foreground">
            Account
          </Label>
          <Select value={filters.accountId} onValueChange={setTransactionAccountFilter}>
            <SelectTrigger id="transaction-filter-account" className="h-9 w-full">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {paymentAccounts.map((account) => (
                <SelectItem key={account.id} value={String(account.id)}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DateFilterField
          id="transaction-filter-date-from"
          label="From"
          value={filters.dateFrom}
          placeholder="Any date"
          onChange={setTransactionTableDateFrom}
        />

        <DateFilterField
          id="transaction-filter-date-to"
          label="To"
          value={filters.dateTo}
          placeholder="Any date"
          onChange={setTransactionTableDateTo}
        />
      </div>

      {activeCount > 0 ? (
        <div className="mt-3 flex justify-end border-t border-border/70 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            onClick={resetTransactionTableFilters}
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  ) : null

  return children({ toolbarStart, belowToolbar })
}

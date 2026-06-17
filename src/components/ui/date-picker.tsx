import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { cn } from '#/lib/utils'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, X } from 'lucide-react'
import { useState } from 'react'

interface DatePickerFieldProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  optional?: boolean
  className?: string
  disabled?: boolean
}

/**
 * Single-date picker field using shadcn Calendar + Popover.
 * Values are stored as yyyy-MM-dd strings for form state.
 */
export function DatePickerField({
  id,
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
  optional = false,
  className,
  disabled = false,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = value ? parseISO(value) : undefined

  function handleSelect(date: Date | undefined) {
    if (!date) {
      return
    }

    onChange(format(date, 'yyyy-MM-dd'))
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setOpen(false)
  }

  return (
    <div className={cn('grid gap-2', className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
            {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
          </label>
          {optional && value ? (
            <button
              type="button"
              className="text-xs text-primary underline-offset-4 hover:underline"
              onClick={handleClear}
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn('flex-1 justify-start text-left font-normal', !value && 'text-muted-foreground')}
            >
              <CalendarIcon className="size-4 opacity-70" />
              {value ? format(selectedDate!, 'MMM d, yyyy') : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[calc(100vw-1rem)] overflow-hidden p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={handleSelect} defaultMonth={selectedDate} />
          </PopoverContent>
        </Popover>
        {optional && value ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label="Clear date"
            onClick={handleClear}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

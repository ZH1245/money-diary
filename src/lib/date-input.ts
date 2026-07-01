import { format, parseISO } from 'date-fns'
import { formatInstantInTimeZone, getClientTimeZone } from '#/lib/timezone'

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parses a calendar date string (yyyy-MM-dd) as local midnight.
 */
export function parseCalendarDate(value: string): Date {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return parseISO(value)
  }

  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Formats a Date as a calendar date string in the user's local timezone.
 */
export function formatCalendarDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Returns today's calendar date in the user's local timezone.
 */
export function getCalendarToday(): string {
  const now = new Date()
  return formatCalendarDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
}

/**
 * Returns a calendar date N days before the given yyyy-MM-dd value.
 */
export function subtractCalendarDays(dateValue: string, days: number): string {
  const date = parseCalendarDate(dateValue)
  date.setDate(date.getDate() - days)
  return formatCalendarDate(date)
}

/**
 * Converts API timestamps to date input values in the user's timezone.
 */
export function toInputDate(value: string, timeZone = getClientTimeZone()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(value))
}

/**
 * Converts API timestamps to time input values (HH:mm) in the user's timezone.
 */
export function toInputTime(value: string, timeZone = getClientTimeZone()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

/**
 * Converts a date input value into a UTC ISO timestamp (…Z) for the API.
 */
export function toIsoDateAtNoon(dateValue: string): string {
  const local = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(local.getTime())) {
    throw new Error('Invalid date')
  }
  return local.toISOString()
}

/**
 * Combines date and time inputs into a UTC ISO timestamp (…Z) for the API.
 */
export function toIsoFromDateAndTime(dateValue: string, timeValue: string): string {
  const local = new Date(`${dateValue}T${timeValue}:00`)
  if (Number.isNaN(local.getTime())) {
    throw new Error('Invalid date or time')
  }
  return local.toISOString()
}

/**
 * Formats a transaction timestamp for display (date + time) in local timezone.
 */
export function formatTransactionHappenedAtLabel(
  iso: string,
  timeZone = getClientTimeZone(),
): string {
  return formatInstantInTimeZone(iso, timeZone, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Returns true when the combined date/time is after the current moment.
 */
export function isFutureDateAndTime(dateValue: string, timeValue: string): boolean {
  const parsed = new Date(`${dateValue}T${timeValue}:00`)
  if (Number.isNaN(parsed.getTime())) {
    return false
  }

  return parsed.getTime() > Date.now()
}

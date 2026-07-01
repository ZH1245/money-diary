import { parseISO } from 'date-fns'
import { formatInstantInTimeZone, getClientTimeZone } from '#/lib/timezone'

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parses a calendar date string (yyyy-MM-dd) as local noon to avoid DST/UTC shifts.
 */
export function parseCalendarDate(value: string): Date {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return parseISO(value)
  }

  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

/**
 * Formats a Date as a calendar date string (yyyy-MM-dd) in local time.
 */
export function formatCalendarDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA').format(date)
}

/**
 * Formats a calendar date string for compact UI labels.
 */
export function formatCalendarLabel(
  dateValue: string,
  options?: { includeYear?: boolean },
): string {
  const date = parseCalendarDate(dateValue)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    ...(options?.includeYear ? { year: 'numeric' } : {}),
  }).format(date)
}

/**
 * Returns today's calendar date in the user's local timezone.
 */
export function getCalendarToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
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
 * True when the instant is exactly 12:00 in the given timezone (date-only placeholder time).
 */
function isCalendarNoonInTimeZone(iso: string, timeZone: string): boolean {
  return toInputTime(iso, timeZone) === '12:00'
}

/**
 * Formats a transaction timestamp for display (date + time) in local timezone.
 * Omits time when the value is the default noon placeholder (12:00).
 */
export function formatTransactionHappenedAtLabel(
  iso: string,
  timeZone = getClientTimeZone(),
): string {
  if (isCalendarNoonInTimeZone(iso, timeZone)) {
    return formatInstantInTimeZone(iso, timeZone, { dateStyle: 'medium' })
  }

  return formatInstantInTimeZone(iso, timeZone, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Compact transaction timestamp for narrow table rows (omits year when current).
 * Omits time when the value is the default noon placeholder (12:00).
 */
export function formatTransactionHappenedAtCompact(
  iso: string,
  timeZone = getClientTimeZone(),
): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return iso
  }

  const now = new Date()
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: 'short',
    day: 'numeric',
    ...(parsed.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    ...(!isCalendarNoonInTimeZone(iso, timeZone)
      ? { hour: 'numeric', minute: '2-digit' }
      : {}),
  })

  return formatter.format(parsed)
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

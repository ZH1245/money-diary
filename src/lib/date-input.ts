import { format, parseISO } from 'date-fns'

/**
 * Converts API timestamps to date input values.
 */
export function toInputDate(value: string): string {
  return format(parseISO(value), 'yyyy-MM-dd')
}

/**
 * Converts API timestamps to time input values (local HH:mm).
 */
export function toInputTime(value: string): string {
  return format(parseISO(value), 'HH:mm')
}

/**
 * Converts a date input value into an ISO timestamp for the API (legacy noon default).
 */
export function toIsoDateAtNoon(dateValue: string): string {
  return new Date(`${dateValue}T12:00:00`).toISOString()
}

/**
 * Combines date and time inputs into an ISO timestamp for the API.
 */
export function toIsoFromDateAndTime(dateValue: string, timeValue: string): string {
  return new Date(`${dateValue}T${timeValue}:00`).toISOString()
}

/**
 * Formats a transaction timestamp for display (date + time).
 */
export function formatTransactionHappenedAtLabel(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
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

import { format, parseISO } from 'date-fns'

/**
 * Converts API timestamps to date input values.
 */
export function toInputDate(value: string): string {
  return format(parseISO(value), 'yyyy-MM-dd')
}

/**
 * Converts a date input value into an ISO timestamp for the API.
 */
export function toIsoDateAtNoon(dateValue: string): string {
  return new Date(`${dateValue}T12:00:00`).toISOString()
}

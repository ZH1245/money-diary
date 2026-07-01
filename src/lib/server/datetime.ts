import { resolveTimeZone } from '#/lib/timezone'

const UTC_ISO_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/i

/**
 * Parses a client/API datetime string into a UTC Date for database storage.
 */
export function parseUtcDateTimeInput(value: string): Date {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('Datetime is required')
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid datetime')
  }

  return parsed
}

/**
 * Normalizes a datetime to an ISO-8601 UTC string (…Z) for API responses.
 */
export function toUtcIsoString(value: Date | string): string {
  const date = value instanceof Date ? value : parseUtcDateTimeInput(value)
  return date.toISOString()
}

/**
 * Returns true when the string includes an explicit UTC offset (Z or ±hh:mm).
 */
export function hasExplicitUtcOffset(value: string): boolean {
  return UTC_ISO_SUFFIX.test(value.trim())
}

/**
 * Builds a UTC instant from calendar date + time interpreted in a user timezone.
 * Uses the environment Intl API (Node 20+).
 */
export function zonedDateTimeToUtc(
  dateValue: string,
  timeValue: string,
  timeZone: string,
): Date {
  const zone = resolveTimeZone(timeZone)
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hour, minute] = timeValue.split(':').map(Number)

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    throw new Error('Invalid date or time')
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(new Date(utcGuess))
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour') % 24,
    read('minute'),
    0,
    0,
  )

  const offsetMs = asUtc - utcGuess
  return new Date(utcGuess - offsetMs)
}

/**
 * Noon on a calendar date in the user's timezone, stored as UTC.
 */
export function calendarDateNoonToUtc(dateValue: string, timeZone: string): Date {
  return zonedDateTimeToUtc(dateValue, '12:00', timeZone)
}

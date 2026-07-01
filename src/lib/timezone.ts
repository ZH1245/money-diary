/** Fallback when the client does not send a timezone header. */
export const DEFAULT_TIMEZONE = 'UTC'

/**
 * Returns true when the value is a valid IANA timezone identifier.
 */
export function isValidIanaTimeZone(value: string): boolean {
  if (!value.trim()) {
    return false
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: value })
    return true
  } catch {
    return false
  }
}

/**
 * Validates an IANA timezone from the request header, or falls back to UTC.
 */
export function resolveTimeZone(value?: string | null): string {
  const trimmed = value?.trim()
  if (trimmed && isValidIanaTimeZone(trimmed)) {
    return trimmed
  }

  return DEFAULT_TIMEZONE
}

/**
 * Browser/device timezone from Intl (client-only).
 */
export function getClientTimeZone(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_TIMEZONE
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/**
 * Calendar date (yyyy-MM-dd) for "today" in the given IANA timezone.
 */
export function getCalendarTodayInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
}

/**
 * Formats a UTC ISO instant for display in a specific timezone.
 */
export function formatInstantInTimeZone(
  iso: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return iso
  }

  return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(parsed)
}

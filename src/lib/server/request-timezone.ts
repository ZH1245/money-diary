import { resolveTimeZone } from '#/lib/timezone'

const TIMEZONE_HEADER = 'x-time-zone'

/**
 * Reads the client IANA timezone from the X-Time-Zone request header (browser).
 */
export function readRequestTimeZone(request: Request): string | null {
  const value = request.headers.get(TIMEZONE_HEADER)?.trim()
  return value || null
}

/**
 * Browser timezone for this request — used for server-side calendar boundaries only.
 * Not stored per user; the client converts UTC ↔ local for display.
 */
export function resolveRequestTimeZone(request: Request): string {
  return resolveTimeZone(readRequestTimeZone(request))
}

export { TIMEZONE_HEADER }

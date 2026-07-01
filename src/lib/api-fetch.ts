import { getClientTimeZone } from '#/lib/timezone'

const TIMEZONE_HEADER = 'x-time-zone'

/**
 * fetch wrapper that sends the device IANA timezone on every API call.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)

  if (!headers.has(TIMEZONE_HEADER)) {
    headers.set(TIMEZONE_HEADER, getClientTimeZone())
  }

  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  return fetch(input, {
    ...init,
    headers,
  })
}

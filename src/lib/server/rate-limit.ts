import { consumeRateLimitBucket } from '#/lib/server/rate-limit-store'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 120

/**
 * Returns a client key for rate limiting based on IP and route.
 */
function getRateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'local'
  const pathname = new URL(request.url).pathname
  return `rate:${clientIp}:${pathname}`
}

/**
 * Enforces a Postgres-backed request rate limit per IP and route.
 */
export async function enforceRateLimit(request: Request): Promise<Response | null> {
  if (request.method === 'OPTIONS') return null

  try {
    const result = await consumeRateLimitBucket({
      bucketKey: getRateLimitKey(request),
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
    })

    if (!result.allowed) {
      return Response.json(
        { success: false, error: 'Too many requests. Try again shortly.' },
        {
          status: 429,
          headers: {
            'retry-after': String(result.retryAfterSeconds ?? 60),
          },
        },
      )
    }
  } catch {
    // Allow traffic when the limiter store is unavailable (e.g. migration not applied yet).
    return null
  }

  return null
}

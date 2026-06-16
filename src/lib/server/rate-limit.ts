const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 120

interface RateLimitBucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()

/**
 * Returns a client key for rate limiting based on IP and route.
 */
function getRateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'local'
  const pathname = new URL(request.url).pathname
  return `${clientIp}:${pathname}`
}

/**
 * Enforces a simple in-memory request rate limit per IP and route.
 */
export function enforceRateLimit(request: Request): Response | null {
  if (request.method === 'OPTIONS') return null

  const key = getRateLimitKey(request)
  const now = Date.now()
  const currentBucket = buckets.get(key)

  if (!currentBucket || now >= currentBucket.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return null
  }

  if (currentBucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return Response.json(
      { success: false, error: 'Too many requests. Try again shortly.' },
      {
        status: 429,
        headers: {
          'retry-after': String(Math.ceil((currentBucket.resetAt - now) / 1000)),
        },
      },
    )
  }

  currentBucket.count += 1
  buckets.set(key, currentBucket)
  return null
}

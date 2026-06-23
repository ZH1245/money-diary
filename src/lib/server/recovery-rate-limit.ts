import { consumeRateLimitBucket } from '#/lib/server/rate-limit-store'

const RECOVERY_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RECOVERY_RATE_LIMIT_MAX_REQUESTS = 10

/**
 * Applies a stricter Postgres-backed rate limit for password recovery endpoints.
 */
export async function enforceRecoveryRateLimit(request: Request): Promise<Response | null> {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'local'
  const pathname = new URL(request.url).pathname
  const bucketKey = `recovery:${clientIp}:${pathname}`

  try {
    const result = await consumeRateLimitBucket({
      bucketKey,
      windowMs: RECOVERY_RATE_LIMIT_WINDOW_MS,
      maxRequests: RECOVERY_RATE_LIMIT_MAX_REQUESTS,
    })

    if (!result.allowed) {
      return Response.json(
        { success: false, error: 'Too many recovery attempts. Try again later.' },
        { status: 429 },
      )
    }
  } catch {
    return null
  }

  return null
}

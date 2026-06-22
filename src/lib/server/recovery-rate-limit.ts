const RECOVERY_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RECOVERY_RATE_LIMIT_MAX_REQUESTS = 10

interface RecoveryRateLimitBucket {
  count: number
  resetAt: number
}

const recoveryBuckets = new Map<string, RecoveryRateLimitBucket>()

/**
 * Applies a stricter rate limit for password recovery endpoints.
 */
export function enforceRecoveryRateLimit(request: Request): Response | null {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'local'
  const pathname = new URL(request.url).pathname
  const key = `${clientIp}:${pathname}`
  const now = Date.now()
  const currentBucket = recoveryBuckets.get(key)

  if (!currentBucket || now >= currentBucket.resetAt) {
    recoveryBuckets.set(key, {
      count: 1,
      resetAt: now + RECOVERY_RATE_LIMIT_WINDOW_MS,
    })
    return null
  }

  if (currentBucket.count >= RECOVERY_RATE_LIMIT_MAX_REQUESTS) {
    return Response.json(
      { success: false, error: 'Too many recovery attempts. Try again later.' },
      { status: 429 },
    )
  }

  currentBucket.count += 1
  recoveryBuckets.set(key, currentBucket)
  return null
}

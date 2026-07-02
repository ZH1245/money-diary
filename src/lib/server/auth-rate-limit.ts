import { createHash } from 'node:crypto'
import { consumeRateLimitBucket } from '#/lib/server/rate-limit-store'
import { getClientIp } from '#/lib/server/request-ip'

interface RateLimitPolicy {
  windowMs: number
  maxRequests: number
}

interface AuthPathPolicy {
  policy: string
  ip: RateLimitPolicy
  email?: RateLimitPolicy
}

const AUTH_PATH_POLICIES: Array<{ suffix: string } & AuthPathPolicy> = [
  {
    suffix: '/sign-in/email',
    policy: 'sign-in',
    ip: { windowMs: 60_000, maxRequests: 10 },
    email: { windowMs: 5 * 60_000, maxRequests: 5 },
  },
  {
    suffix: '/sign-up/email',
    policy: 'sign-up',
    ip: { windowMs: 60 * 60_000, maxRequests: 5 },
  },
  {
    suffix: '/email-otp/send-verification-otp',
    policy: 'otp-send',
    ip: { windowMs: 60 * 60_000, maxRequests: 10 },
    email: { windowMs: 10 * 60_000, maxRequests: 3 },
  },
  {
    suffix: '/sign-in/email-otp',
    policy: 'otp-sign-in',
    ip: { windowMs: 60_000, maxRequests: 10 },
    email: { windowMs: 5 * 60_000, maxRequests: 5 },
  },
  {
    suffix: '/forget-password',
    policy: 'forget-password',
    ip: { windowMs: 60 * 60_000, maxRequests: 5 },
    email: { windowMs: 60 * 60_000, maxRequests: 3 },
  },
]

function tooManyRequestsResponse(retryAfterSeconds: number | undefined): Response {
  return Response.json(
    { success: false, error: 'Too many requests. Try again shortly.' },
    {
      status: 429,
      headers: {
        'retry-after': String(retryAfterSeconds ?? 60),
      },
    },
  )
}

function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 16)
}

async function extractEmail(request: Request): Promise<string | null> {
  try {
    const body = (await request.clone().json()) as Record<string, unknown>
    const email = body?.email
    return typeof email === 'string' && email.trim() ? email : null
  } catch {
    return null
  }
}

/**
 * Enforces Postgres-backed per-IP and per-email rate limits on sensitive better-auth endpoints.
 */
export async function enforceAuthRateLimit(request: Request): Promise<Response | null> {
  const pathname = new URL(request.url).pathname
  const matched = AUTH_PATH_POLICIES.find(({ suffix }) => pathname.endsWith(suffix))
  if (!matched) return null

  try {
    const clientIp = getClientIp(request) ?? 'local'
    const ipResult = await consumeRateLimitBucket({
      bucketKey: `auth:${matched.policy}:ip:${clientIp}`,
      windowMs: matched.ip.windowMs,
      maxRequests: matched.ip.maxRequests,
    })
    if (!ipResult.allowed) {
      return tooManyRequestsResponse(ipResult.retryAfterSeconds)
    }

    if (matched.email) {
      const email = await extractEmail(request)
      if (email) {
        const emailResult = await consumeRateLimitBucket({
          bucketKey: `auth:${matched.policy}:email:${hashEmail(email)}`,
          windowMs: matched.email.windowMs,
          maxRequests: matched.email.maxRequests,
        })
        if (!emailResult.allowed) {
          return tooManyRequestsResponse(emailResult.retryAfterSeconds)
        }
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Enforces a Postgres-backed per-user rate limit for a named scope (e.g. AI endpoints).
 */
export async function enforceUserRateLimit({
  userId,
  scope,
  windowMs,
  maxRequests,
}: {
  userId: string
  scope: string
  windowMs: number
  maxRequests: number
}): Promise<Response | null> {
  try {
    const result = await consumeRateLimitBucket({
      bucketKey: `ai:${scope}:${userId}`,
      windowMs,
      maxRequests,
    })
    if (!result.allowed) {
      return tooManyRequestsResponse(result.retryAfterSeconds)
    }
  } catch {
    return null
  }

  return null
}

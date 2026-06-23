import { eq, lt, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import { rateLimitBuckets } from '#/db/schema'

export interface RateLimitConsumeResult {
  allowed: boolean
  retryAfterSeconds?: number
}

/**
 * Atomically increments a rate-limit bucket in Postgres (shared across serverless instances).
 */
export async function consumeRateLimitBucket({
  bucketKey,
  windowMs,
  maxRequests,
}: {
  bucketKey: string
  windowMs: number
  maxRequests: number
}): Promise<RateLimitConsumeResult> {
  const now = Date.now()
  const nextResetAt = new Date(now + windowMs)

  await db.delete(rateLimitBuckets).where(lt(rateLimitBuckets.resetAt, new Date(now)))

  const result = await db
    .insert(rateLimitBuckets)
    .values({
      bucketKey,
      hitCount: 1,
      resetAt: nextResetAt,
    })
    .onConflictDoUpdate({
      target: rateLimitBuckets.bucketKey,
      set: {
        hitCount: sql`CASE
          WHEN ${rateLimitBuckets.resetAt} <= NOW() THEN 1
          ELSE ${rateLimitBuckets.hitCount} + 1
        END`,
        resetAt: sql`CASE
          WHEN ${rateLimitBuckets.resetAt} <= NOW() THEN ${nextResetAt}
          ELSE ${rateLimitBuckets.resetAt}
        END`,
      },
    })
    .returning({
      hitCount: rateLimitBuckets.hitCount,
      resetAt: rateLimitBuckets.resetAt,
    })

  const row = result[0]
  if (!row) {
    return { allowed: true }
  }

  const resetAt = row.resetAt.getTime()

  if (row.hitCount > maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    }
  }

  return { allowed: true }
}

/**
 * Reads bucket state without incrementing (for abuse block checks).
 */
export async function getRateLimitBucket(bucketKey: string) {
  const [row] = await db
    .select({
      hitCount: rateLimitBuckets.hitCount,
      resetAt: rateLimitBuckets.resetAt,
    })
    .from(rateLimitBuckets)
    .where(eq(rateLimitBuckets.bucketKey, bucketKey))
    .limit(1)

  return row ?? null
}

/**
 * Upserts bucket counters for abuse strikes and block windows.
 */
export async function upsertRateLimitBucket({
  bucketKey,
  hitCount,
  resetAt,
}: {
  bucketKey: string
  hitCount: number
  resetAt: Date
}) {
  await db
    .insert(rateLimitBuckets)
    .values({
      bucketKey,
      hitCount,
      resetAt,
    })
    .onConflictDoUpdate({
      target: rateLimitBuckets.bucketKey,
      set: {
        hitCount,
        resetAt,
      },
    })
}

/**
 * Removes an expired or reset abuse bucket.
 */
export async function deleteRateLimitBucket(bucketKey: string) {
  await db.delete(rateLimitBuckets).where(eq(rateLimitBuckets.bucketKey, bucketKey))
}

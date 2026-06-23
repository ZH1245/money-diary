const INJECTION_PATTERNS = [
  /ignore (all|previous|prior|above) (instructions|rules|prompts?)/i,
  /disregard (the )?(system|previous) (prompt|instructions|rules)/i,
  /reveal (the )?(system|hidden|secret) (prompt|instructions|rules)/i,
  /show (me )?(the )?(system|hidden|secret) (prompt|instructions)/i,
  /what (is|are) (your|the) (system|hidden) (prompt|instructions)/i,
  /act as (a )?(dan|jailbreak|unfiltered|uncensored)/i,
  /pretend (you are|to be) (not|no longer) restricted/i,
  /bypass (security|restrictions|rules|guardrails)/i,
  /other users?'? (data|accounts|transactions|records)/i,
  /all users?'? (data|accounts|transactions)/i,
  /admin (access|mode|panel|override)/i,
  /sql injection/i,
  /drop table/i,
  /export (all|every) (user|customer|database)/i,
  /send (me )?(api|secret|env|database) (key|keys|url|password)/i,
]

const OFF_TOPIC_PATTERNS = [
  /write (me )?(a )?(poem|story|essay|code for)/i,
  /help (me )?(with )?(homework|dating|medical|legal advice)/i,
]

import {
  deleteRateLimitBucket,
  getRateLimitBucket,
  upsertRateLimitBucket,
} from '#/lib/server/rate-limit-store'

const MAX_STRIKES = 3
const BLOCK_DURATION_MS = 30 * 60 * 1000

function abuseBucketKey(userId: string) {
  return `abuse:${userId}`
}

export interface AiSecurityCheckResult {
  allowed: boolean
  closeChat?: boolean
  reason?: string
  warning?: string
}

/**
 * Returns true when a user message looks like prompt injection or abuse.
 */
export function detectPromptInjection(content: string): boolean {
  const normalized = content.trim()
  if (!normalized) return false

  return INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))
}

/**
 * Returns true when the message is clearly outside Money Diary scope.
 */
export function detectOffTopicRequest(content: string): boolean {
  const normalized = content.trim()
  if (!normalized) return false
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized))
}

/**
 * Tracks repeated abuse attempts and blocks chat after threshold.
 */
export async function evaluateAbuseState(userId: string): Promise<AiSecurityCheckResult> {
  const bucket = await getRateLimitBucket(abuseBucketKey(userId))
  if (!bucket) return { allowed: true }

  const now = Date.now()
  const blockedUntil = bucket.resetAt.getTime()

  if (bucket.hitCount >= MAX_STRIKES && blockedUntil > now) {
    return {
      allowed: false,
      closeChat: true,
      reason: 'Chat closed due to repeated unsafe requests. Try again later.',
    }
  }

  if (blockedUntil <= now) {
    await deleteRateLimitBucket(abuseBucketKey(userId))
  }

  return { allowed: true }
}

/**
 * Records an unsafe user attempt and may block further chat usage.
 */
export async function recordAbuseStrike(userId: string): Promise<AiSecurityCheckResult> {
  const bucketKey = abuseBucketKey(userId)
  const existing = await getRateLimitBucket(bucketKey)
  const now = Date.now()
  const strikes =
    existing && existing.resetAt.getTime() > now ? existing.hitCount + 1 : 1

  if (strikes >= MAX_STRIKES) {
    await upsertRateLimitBucket({
      bucketKey,
      hitCount: strikes,
      resetAt: new Date(now + BLOCK_DURATION_MS),
    })
    return {
      allowed: false,
      closeChat: true,
      reason: 'Chat closed after repeated unsafe requests.',
    }
  }

  await upsertRateLimitBucket({
    bucketKey,
    hitCount: strikes,
    resetAt: new Date(now + BLOCK_DURATION_MS),
  })

  return {
    allowed: true,
    warning: 'Stay within Money Diary finance actions only.',
  }
}

import { getMessageContentCharLimit } from '#/features/ai/utils/ai-bulk-paste'

/**
 * Validates incoming chat messages before they reach the model.
 */
export function validateChatMessages(messages: Array<{ role: string; content: string }>): AiSecurityCheckResult {
  const userMessages = messages.filter((message) => message.role === 'user')
  const lastUserMessage = userMessages.at(-1)

  if (!lastUserMessage) {
    return { allowed: false, reason: 'A user message is required.' }
  }

  const charLimit = getMessageContentCharLimit(lastUserMessage.content)
  if (lastUserMessage.content.length > charLimit) {
    return {
      allowed: false,
      reason:
        charLimit > 1200
          ? `Pasted list is too long (max ${charLimit.toLocaleString()} characters). Split into smaller chunks.`
          : 'Message is too long.',
    }
  }

  if (detectPromptInjection(lastUserMessage.content)) {
    return { allowed: false, reason: 'Unsafe request blocked.' }
  }

  if (detectOffTopicRequest(lastUserMessage.content)) {
    return {
      allowed: false,
      reason: 'I can only help with your Money Diary finance entries.',
    }
  }

  return { allowed: true }
}

/**
 * Returns true when assistant text exposes internal database identifiers.
 */
export function detectAssistantInternalLeak(content: string): boolean {
  const normalized = content.trim()
  if (!normalized) return false

  return (
    /\(\s*id\s*:\s*\d+\s*\)/i.test(normalized) ||
    /\b(paymentAccountId|categoryId|goalId)\s*[:=]/i.test(normalized) ||
    /\bref\s*[:=]\s*\d+/i.test(normalized) ||
    /\bdatabase\s+id\b/i.test(normalized) ||
    /\binternal\s+ref\b/i.test(normalized)
  )
}

/**
 * Strips internal IDs from user-visible assistant messages.
 */
export function sanitizeAssistantUserFacingMessage(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return trimmed

  if (!detectAssistantInternalLeak(trimmed)) return trimmed

  const redacted = trimmed
    .replace(/\(\s*id\s*:\s*\d+\s*\)/gi, '')
    .replace(/\[\s*ref\s+\d+\s*\]/gi, '')
    .replace(/\b(paymentAccountId|categoryId|goalId)\s*[:=]\s*\d+/gi, '')
    .replace(/\bref\s*[:=]\s*\d+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.?!])/g, '$1')
    .trim()

  if (redacted.length >= 24 && !detectAssistantInternalLeak(redacted)) {
    return redacted
  }

  return 'I can match your accounts and categories by name. Tell me which account was used (for example Meezan Bank or Nayapay) and I will log it.'
}

export { buildSecureSystemPrompt } from '#/features/ai/server/ai-prompt-builder'
export { sanitizeChatMessages } from '#/features/ai/server/ai-history-window'

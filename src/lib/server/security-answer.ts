import { hashPassword, verifyPassword } from 'better-auth/crypto'

/**
 * Normalizes free-text security answers for consistent hashing and comparison.
 */
export function normalizeSecurityAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Hashes a normalized security answer for storage.
 */
export async function hashSecurityAnswer(answer: string): Promise<string> {
  const normalized = normalizeSecurityAnswer(answer)
  if (!normalized) {
    throw new Error('Security answer is required')
  }
  return hashPassword(normalized)
}

/**
 * Verifies a security answer against a stored hash.
 */
export async function verifySecurityAnswer(answer: string, storedHash: string): Promise<boolean> {
  const normalized = normalizeSecurityAnswer(answer)
  if (!normalized) return false
  return verifyPassword({ password: normalized, hash: storedHash })
}

/**
 * Masks a recovery email for display in settings.
 */
export function maskRecoveryEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '••••'
  const visible = localPart.slice(0, Math.min(2, localPart.length))
  return `${visible}•••@${domain}`
}

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getEncryptionKey(): Buffer {
  const source =
    process.env.ENV_SECRETS ??
    process.env.AI_SETTINGS_ENCRYPTION_KEY ??
    process.env.BETTER_AUTH_SECRET ??
    ''
  if (!source.trim()) {
    throw new Error('Missing ENV_SECRETS (or AI_SETTINGS_ENCRYPTION_KEY / BETTER_AUTH_SECRET fallback)')
  }

  return createHash('sha256').update(source).digest()
}

/**
 * Encrypts plain text values for secrets stored in Postgres.
 */
export function encryptSecret(value: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts persisted encrypted secret values.
 */
export function decryptSecret(payload: string): string {
  const [ivHex, authTagHex, encryptedHex] = payload.split(':')
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted payload format')
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * Masks sensitive values for settings screens.
 */
export function maskSecret(value: string): string {
  if (value.length <= 8) return '*'.repeat(Math.max(4, value.length))
  return `${value.slice(0, 4)}${'*'.repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`
}

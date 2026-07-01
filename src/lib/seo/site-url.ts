/** Canonical production origin for Money Diary. */
export const PRODUCTION_SITE_ORIGIN = 'https://money-diary.zainharoon.com'

/** Hostname for auth allowlists and deployment config. */
export const PRODUCTION_SITE_HOST = 'money-diary.zainharoon.com'

/** Root domain (marketing / future use). */
export const ROOT_DOMAIN = 'zainharoon.com'

/** Origin used when no domain/env is configured (dev). */
export const DEFAULT_SITE_URL = 'http://localhost:3000'

/**
 * Resolves the public site origin for sitemaps and canonical URLs (server-only).
 * Prefers SERVER_URL, then Vercel production URL, then the canonical custom domain.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.SERVER_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL
  if (!raw?.trim()) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return PRODUCTION_SITE_ORIGIN
    }
    return DEFAULT_SITE_URL
  }

  const trimmed = raw.trim().replace(/\/$/, '')
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  return `https://${trimmed}`
}

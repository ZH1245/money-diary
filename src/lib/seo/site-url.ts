/** Origin used when no domain/env is configured (dev). */
export const DEFAULT_SITE_URL = 'http://localhost:3000'

/**
 * Resolves the public site origin for sitemaps and canonical URLs (server-only).
 * Prefers an explicit SERVER_URL, then the stable Vercel production domain.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.SERVER_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL
  if (!raw?.trim()) {
    return DEFAULT_SITE_URL
  }

  const trimmed = raw.trim().replace(/\/$/, '')
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  return `https://${trimmed}`
}

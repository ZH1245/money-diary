import { DEFAULT_SITE_URL, PRODUCTION_SITE_ORIGIN } from '#/lib/seo/site-url'

export const SITE_NAME = 'Money Diary'

export const DEFAULT_OG_IMAGE_PATH = '/landing/dashboard-desktop-calm-light.webp'

export const LANDING_SEO = {
  title: 'Money Diary — personal finance made simple',
  description:
    'Track income, expenses, savings, and goals. Log transactions in plain English with AI. Free to start — your data stays private.',
} as const

export const SIGN_IN_SEO = {
  title: 'Sign in',
  description: 'Sign in to Money Diary to manage your income, expenses, savings, and financial goals.',
} as const

export const SIGN_UP_SEO = {
  title: 'Create your account',
  description:
    'Create a free Money Diary account to track spending, savings, and goals with optional AI assistance.',
} as const

/** Public indexable paths included in the sitemap. */
export const SITEMAP_PATHS = ['/', '/sign-in', '/sign-up', '/privacy', '/terms'] as const

export const PRIVACY_SEO = {
  title: 'Privacy Policy',
  description:
    'How Money Diary collects, uses, and protects your personal and financial data.',
} as const

export const TERMS_SEO = {
  title: 'Terms of Service',
  description: 'Terms of use for the Money Diary personal finance app.',
} as const

interface PublicPageSeoInput {
  title: string
  description: string
  path: string
  imagePath?: string
}

/** Client-safe site origin for canonical and Open Graph URLs. */
export function getClientSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    const trimmed = fromEnv.trim().replace(/\/$/, '')
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
  }
  if (import.meta.env.PROD) {
    return PRODUCTION_SITE_ORIGIN
  }
  return DEFAULT_SITE_URL
}

/**
 * Builds TanStack Router head metadata for public, indexable marketing/auth pages.
 */
export function buildPublicPageHead({
  title,
  description,
  path,
  imagePath = DEFAULT_OG_IMAGE_PATH,
}: PublicPageSeoInput) {
  const siteUrl = getClientSiteUrl()
  const pageUrl = `${siteUrl}${path}`
  const imageUrl = `${siteUrl}${imagePath}`
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`

  return {
    meta: [
      { title: fullTitle },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:url', content: pageUrl },
      { property: 'og:image', content: imageUrl },
      { property: 'og:image:alt', content: 'Money Diary dashboard preview' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
    ],
    links: [{ rel: 'canonical', href: pageUrl }],
  }
}

/** Head metadata for private authenticated app screens. */
export function buildPrivateAppHead(title?: string) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
  return {
    meta: [
      { title: fullTitle },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }
}

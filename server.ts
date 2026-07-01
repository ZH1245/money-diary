import {
  PRODUCTION_SITE_HOST,
  PRODUCTION_SITE_ORIGIN,
} from './src/lib/seo/site-url.ts'

/** Hosts that should 301 to the canonical production origin. */
function isCanonicalAliasHost(hostname: string): boolean {
  if (hostname.endsWith('.vercel.app')) {
    return true
  }

  if (hostname === `www.${PRODUCTION_SITE_HOST}`) {
    return true
  }

  return false
}

/**
 * Redirects non-canonical production hosts (e.g. *.vercel.app) to the primary domain.
 * Preview deployments are left untouched so branch URLs keep working.
 */
export default {
  async fetch(request: Request): Promise<Response | undefined> {
    if (process.env.VERCEL_ENV === 'preview') {
      return undefined
    }

    const isProduction =
      process.env.VERCEL_ENV === 'production' ||
      (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV)

    if (!isProduction) {
      return undefined
    }

    const url = new URL(request.url)
    if (url.hostname === PRODUCTION_SITE_HOST || !isCanonicalAliasHost(url.hostname)) {
      return undefined
    }

    const destination = new URL(`${url.pathname}${url.search}`, PRODUCTION_SITE_ORIGIN)
    return Response.redirect(destination.toString(), 301)
  },
}

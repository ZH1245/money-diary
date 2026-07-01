import {
  PRODUCTION_SITE_HOST,
  ROOT_DOMAIN,
} from '#/lib/seo/site-url'

const DEFAULT_ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'localhost:*',
  '*.vercel.app',
  PRODUCTION_SITE_HOST,
  ROOT_DOMAIN,
  `*.${ROOT_DOMAIN}`,
] as const

/**
 * Parses optional extra host patterns from APP_ALLOWED_HOSTS.
 */
function parseConfiguredHosts() {
  const envValue = process.env.APP_ALLOWED_HOSTS
  if (!envValue) return []

  return envValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * Adds the host from a URL env var when present.
 */
function hostFromUrlEnv(envKey: 'BETTER_AUTH_URL' | 'SERVER_URL') {
  const envValue = process.env[envKey]
  if (!envValue) return null

  try {
    return new URL(envValue).host
  } catch {
    return null
  }
}

/**
 * Host patterns trusted for auth and optional cross-origin API access.
 */
export function resolveAllowedHosts() {
  const hosts = new Set<string>([
    ...DEFAULT_ALLOWED_HOSTS,
    ...parseConfiguredHosts(),
  ])

  const authHost = hostFromUrlEnv('BETTER_AUTH_URL')
  if (authHost) hosts.add(authHost)

  const serverHost = hostFromUrlEnv('SERVER_URL')
  if (serverHost) hosts.add(serverHost)

  return [...hosts]
}

/**
 * Better Auth base URL config for local dev vs multi-host production deploys.
 */
export function resolveAuthBaseUrl() {
  const staticUrl = process.env.BETTER_AUTH_URL

  if (process.env.NODE_ENV !== 'production') {
    return staticUrl ?? 'http://localhost:3000'
  }

  return {
    allowedHosts: resolveAllowedHosts(),
    protocol: 'https' as const,
    ...(staticUrl ? { fallback: staticUrl } : {}),
  }
}

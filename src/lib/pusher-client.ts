import PusherJs from 'pusher-js'

type PusherConfig =
  | { enabled: false }
  | { enabled: true; key: string; cluster: string }

// undefined = not yet fetched; null = disabled or fetch failed
let resolved: PusherJs | null | undefined = undefined
let fetchPromise: Promise<PusherJs | null> | null = null

async function fetchConfig(): Promise<PusherConfig> {
  const res = await fetch('/api/pusher/config')
  return res.json() as Promise<PusherConfig>
}

/**
 * Returns the singleton pusher-js client, or null when Pusher is disabled.
 * Safe to call multiple times — only one connection is ever created.
 * Client-only: never import this in server code.
 */
export async function getPusherClient(): Promise<PusherJs | null> {
  if (typeof window === 'undefined') return null

  if (resolved !== undefined) return resolved

  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const config = await fetchConfig()
      if (!config.enabled) {
        resolved = null
        return null
      }
      const client = new PusherJs(config.key, {
        cluster: config.cluster,
        authEndpoint: '/api/pusher/auth',
      })
      resolved = client
      return client
    } catch {
      resolved = null
      return null
    }
  })()

  return fetchPromise
}

import Pusher from 'pusher'
import { serverEnv } from '#/env.server'

let instance: Pusher | null = null
let initialised = false

/**
 * Returns the server-side Pusher instance, or null when any required env var is unset.
 * Constructed lazily and cached for the process lifetime.
 */
export function getPusherServer(): Pusher | null {
  if (initialised) return instance

  initialised = true
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = serverEnv

  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    instance = null
    return null
  }

  instance = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  })

  return instance
}

/**
 * Triggers a Pusher event. No-ops silently when Pusher is disabled.
 */
export async function triggerPusher(
  channel: string,
  event: string,
  data: unknown,
): Promise<void> {
  const pusher = getPusherServer()
  if (!pusher) return
  await pusher.trigger(channel, event, data)
}

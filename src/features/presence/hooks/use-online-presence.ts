import { usePresenceContext } from '#/features/presence/context/presence-context'

/**
 * Returns the current online member count from the shared presence context.
 * The PresenceMount (authenticated app shell) must be an ancestor.
 * Returns 0 when Pusher is disabled or no data yet.
 */
export function useOnlinePresence(): number {
  const { onlineCount } = usePresenceContext()
  return onlineCount
}

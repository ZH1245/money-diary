import { useRef } from 'react'
import { authClient } from '#/lib/auth-client'

/**
 * Wraps Better Auth session state so UI can distinguish the first unresolved
 * fetch from background refetches (e.g. tab focus while logged out).
 */
export function useAuthSession() {
  const sessionState = authClient.useSession()
  const hasResolvedRef = useRef(false)

  if (!sessionState.isPending) {
    hasResolvedRef.current = true
  }

  return {
    ...sessionState,
    isInitialPending: sessionState.isPending && !hasResolvedRef.current,
  }
}

import { authClient } from '#/lib/auth-client'
import { AUTH_ROLES } from '#/lib/auth-roles'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

/**
 * Redirects restricted or banned users to the account suspended screen.
 */
export function useAccountModerationGuard(role: string | undefined) {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (role === AUTH_ROLES.admin) return
    if (isPending || !session?.user) return

    async function checkModeration() {
      const response = await fetch('/api/auth/moderation-status', { method: 'GET' })
      const payload = (await response.json().catch(() => null)) as {
        data?: {
          accountStatus?: string
          moderationReason?: string | null
        }
      } | null

      if (!response.ok) return

      const accountStatus = payload?.data?.accountStatus
      if (accountStatus === 'active' || !accountStatus) return

      if (accountStatus !== 'restricted' && accountStatus !== 'banned') return

      const moderationReason = payload?.data?.moderationReason ?? ''
      await authClient.signOut()
      await navigate({
        to: '/account-suspended',
        search: {
          status: accountStatus === 'banned' ? 'banned' : 'restricted',
          reason: moderationReason,
        },
      })
    }

    void checkModeration()
  }, [isPending, navigate, role, session?.user])
}

import { authClient } from '#/lib/auth-client'
import { AUTH_ROLES } from '#/lib/auth-roles'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

/**
 * Redirects restricted or banned users to the account suspended screen.
 */
export function useAccountModerationGuard(role: string | undefined) {
  const navigate = useNavigate()

  useEffect(() => {
    if (role === AUTH_ROLES.admin) return

    async function checkModeration() {
      const response = await fetch('/api/auth/moderation-status', { method: 'GET' })
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        accountStatus?: string
        moderationReason?: string | null
        data?: {
          accountStatus?: string
          moderationReason?: string | null
        }
      } | null

      const accountStatus = payload?.accountStatus ?? payload?.data?.accountStatus
      if (response.ok && accountStatus === 'active') return
      if (response.status !== 403 && response.ok) return

      const moderationReason = payload?.moderationReason ?? payload?.data?.moderationReason ?? ''
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
  }, [navigate, role])
}

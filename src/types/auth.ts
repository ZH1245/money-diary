import type { AppShellUser } from '#/components/types/app-shell'
import { DEFAULT_CURRENCY } from '#/lib/currency'

export interface SessionUser extends AppShellUser {
  role?: string
  currency?: string
}

/**
 * Maps a Better Auth session user into shell-ready props.
 */
export function toSessionUser(user: {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
  currency?: string
}): SessionUser {
  return {
    name: user.name ?? undefined,
    email: user.email ?? undefined,
    image: user.image ?? undefined,
    role: user.role,
    currency: (user.currency ?? DEFAULT_CURRENCY).toUpperCase(),
  }
}

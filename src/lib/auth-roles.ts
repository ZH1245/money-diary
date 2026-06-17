/**
 * Role slugs seeded in the `auth_roles` table. Source of truth is the database.
 */
export const AUTH_ROLES = {
  admin: 'admin',
  user: 'user',
} as const

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES]

/** Default role slug for new users; matches `auth_roles` seed and `user.role` default. */
export const DEFAULT_AUTH_ROLE: AuthRole = AUTH_ROLES.user

export const AUTH_ROLES = {
  admin: 'admin',
  user: 'user',
} as const

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES]

export const DEFAULT_AUTH_ROLE: AuthRole = AUTH_ROLES.user

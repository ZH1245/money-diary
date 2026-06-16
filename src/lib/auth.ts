import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '#/db/index'
import { DEFAULT_AUTH_ROLE } from '#/lib/auth-roles'
import { DEFAULT_CURRENCY } from '#/lib/currency'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: DEFAULT_AUTH_ROLE,
        input: false,
      },
      currency: {
        type: 'string',
        required: false,
        defaultValue: DEFAULT_CURRENCY,
        input: true,
      },
    },
  },
  plugins: [tanstackStartCookies()],
})

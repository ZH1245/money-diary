import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/**
 * Validated server environment — import only from server-only modules.
 */
export const serverEnv = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DATABASE_URL_POOLER: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    ENV_SECRETS: z.string().min(1),
    SERVER_URL: z.string().url().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    APP_ALLOWED_HOSTS: z.string().optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})

import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/**
 * Validated server environment — import only from server-only modules.
 */
export const serverEnv = createEnv({
  /**
   * The server environment variables.
   */
  server: {
    /**
     * The database URL.
     */
    DATABASE_URL: z.string().min(1),
    /**
     * The database URL pooler.
     */
    DATABASE_URL_POOLER: z.string().min(1).optional(),
    /**
     * The better auth secret.
     */
    BETTER_AUTH_SECRET: z.string().min(1),
    /**
     * The environment secrets.
     */
    ENV_SECRETS: z.string().min(1),
    /**
     * The server URL.
     */
    SERVER_URL: z.string().url().optional(),
    /**
     * The allowed origins.
     */
    ALLOWED_ORIGINS: z.string().optional(),
    /**
     * The app allowed hosts.
     */
    APP_ALLOWED_HOSTS: z.string().optional(),
    /**
     * The node environment.
     */
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
    /**
     * The resend API key.
     */
    RESEND_API_KEY: z.string().min(1).optional(),
    /**
     * The resend from.
     */
    RESEND_FROM: z.string().optional(),
  },
  /**
   * The runtime environment variables.
   */
  runtimeEnv: process.env,
  /**
   * Whether to treat empty strings as undefined.
   */
  emptyStringAsUndefined: true,
})

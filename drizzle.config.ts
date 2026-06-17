import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

const isProdEnv = process.env.DRIZZLE_ENV === 'prod'

config({
  path: isProdEnv ? '.env.prod' : ['.env.local', '.env'],
  override: isProdEnv,
})

export default defineConfig({
  out: './drizzle',
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})

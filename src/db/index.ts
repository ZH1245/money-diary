import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { serverEnv } from '#/env.server'

import * as authSchema from './auth-schema'
import * as schema from './schema.ts'

const connectionString = serverEnv.DATABASE_URL_POOLER ?? serverEnv.DATABASE_URL

const dbSchema = {
  ...schema,
  ...authSchema,
}

type AppDatabase = NodePgDatabase<typeof dbSchema>

function isNeonDatabaseUrl(databaseUrl: string) {
  try {
    const hostname = new URL(databaseUrl).hostname
    return hostname.endsWith('.neon.tech')
  } catch {
    return false
  }
}

function createDatabase(): AppDatabase {
  if (isNeonDatabaseUrl(connectionString)) {
    return drizzleNeon(neon(connectionString), { schema: dbSchema }) as unknown as AppDatabase
  }

  return drizzleNode(connectionString, { schema: dbSchema })
}

/** Neon HTTP on Vercel; node-postgres for local Docker/native Postgres. */
export const db = createDatabase()

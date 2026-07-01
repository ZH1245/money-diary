import { Pool } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
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

/**
 * Ensures every pooled connection uses UTC for timestamp interpretation.
 */
async function configureUtcSession(client: { query: (sql: string) => Promise<unknown> }) {
  await client.query("SET TIME ZONE 'UTC'")
}

function createDatabase(): AppDatabase {
  if (isNeonDatabaseUrl(connectionString)) {
    const pool = new Pool({ connectionString })
    pool.on('connect', (client: { query: (sql: string) => Promise<unknown> }) => {
      void configureUtcSession(client)
    })
    return drizzleNeon(pool, { schema: dbSchema }) as unknown as AppDatabase
  }

  const pool = new pg.Pool({ connectionString })
  pool.on('connect', (client: pg.PoolClient) => {
    void configureUtcSession(client)
  })
  return drizzleNode(pool, { schema: dbSchema })
}

/** Neon serverless on Vercel; node-postgres for local Docker/native Postgres. */
export const db = createDatabase()

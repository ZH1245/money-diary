import { config } from 'dotenv'
import pg from 'pg'

const isProd = process.env.DRIZZLE_ENV === 'prod'
config({ path: isProd ? '.env.prod' : ['.env.local', '.env'], override: isProd })

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

try {
  await client.connect()
  await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE')
  await client.query('DROP SCHEMA public CASCADE')
  await client.query('CREATE SCHEMA public')
  await client.query('GRANT ALL ON SCHEMA public TO PUBLIC')
  console.log('database schema reset')
} catch (error) {
  console.error('error:', error.message)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}

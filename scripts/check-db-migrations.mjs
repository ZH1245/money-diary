import { config } from 'dotenv'
import pg from 'pg'

const isProd = process.env.DRIZZLE_ENV === 'prod'
config({ path: isProd ? '.env.prod' : ['.env.local', '.env'], override: isProd })

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

try {
  await client.connect()
  console.log('connected: ok')

  const tables = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
  )
  console.log('tables:', tables.rows.map((row) => row.tablename).join(', ') || '(none)')

  try {
    const migrations = await client.query(
      'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at',
    )
    console.log('applied migrations:', migrations.rows.length)
    for (const row of migrations.rows) {
      console.log(`  #${row.id} ${row.created_at}`)
    }
  } catch (error) {
    console.log('migration table:', error.message)
  }
} catch (error) {
  console.error('error:', error.message)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}

-- Session timezone (GMT and UTC are both +00:00 in Postgres — either is fine).
SHOW timezone;

-- What actually matters: column types must be "timestamp with time zone" (timestamptz).
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'transactions' AND column_name IN ('happened_at', 'created_at', 'updated_at'))
    OR (table_name = 'savings' AND column_name IN ('saved_at', 'created_at', 'updated_at'))
    OR (table_name = 'goals' AND column_name IN ('target_date', 'created_at', 'updated_at'))
    OR (table_name = 'recurring_rules' AND column_name IN ('next_run_at', 'last_run_at', 'created_at', 'updated_at'))
  )
ORDER BY table_name, column_name;

-- If any row shows "timestamp without time zone", run: pnpm db:migrate
-- Optional cosmetic default (GMT is already equivalent):
-- ALTER DATABASE neondb SET timezone TO 'UTC';

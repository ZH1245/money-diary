-- Store all instants as UTC (timestamptz). Existing naive timestamps are treated as UTC wall clock.
ALTER TABLE "transactions"
  ALTER COLUMN "happened_at" TYPE timestamptz USING "happened_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint

ALTER TABLE "savings"
  ALTER COLUMN "saved_at" TYPE timestamptz USING "saved_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint

ALTER TABLE "goals"
  ALTER COLUMN "target_date" TYPE timestamptz USING "target_date" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint

ALTER TABLE "recurring_rules"
  ALTER COLUMN "next_run_at" TYPE timestamptz USING "next_run_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "last_run_at" TYPE timestamptz USING "last_run_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC';

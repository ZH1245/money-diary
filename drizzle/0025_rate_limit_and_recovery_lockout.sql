CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "bucket_key" text PRIMARY KEY NOT NULL,
  "hit_count" integer DEFAULT 1 NOT NULL,
  "reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "rate_limit_buckets_reset_at_idx"
ON "rate_limit_buckets" USING btree ("reset_at");
--> statement-breakpoint

ALTER TABLE "user_security_profile"
ADD COLUMN IF NOT EXISTS "failed_recovery_attempts" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

ALTER TABLE "user_security_profile"
ADD COLUMN IF NOT EXISTS "recovery_locked_until" timestamp with time zone;

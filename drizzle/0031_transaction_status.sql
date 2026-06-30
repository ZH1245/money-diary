ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'confirmed';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_status_idx" ON "transactions" ("status");

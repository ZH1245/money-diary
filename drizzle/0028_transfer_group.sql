ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "transfer_group_id" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_transfer_group_id_idx" ON "transactions" ("transfer_group_id");

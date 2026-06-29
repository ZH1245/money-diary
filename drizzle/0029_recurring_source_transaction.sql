ALTER TABLE "recurring_rules" ADD COLUMN IF NOT EXISTS "source_transaction_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_source_transaction_id_transactions_id_fk" FOREIGN KEY ("source_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recurring_rules_source_transaction_id_idx" ON "recurring_rules" ("source_transaction_id");

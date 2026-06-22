ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "account_status" text DEFAULT 'active' NOT NULL;
--> statement-breakpoint

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "moderation_reason" text;
--> statement-breakpoint

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "moderated_at" timestamp;
--> statement-breakpoint

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "moderated_by" text;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "user"
  ADD CONSTRAINT "user_moderated_by_user_id_fk"
  FOREIGN KEY ("moderated_by")
  REFERENCES "public"."user"("id")
  ON DELETE set null
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

UPDATE "user"
SET "account_status" = 'active'
WHERE "account_status" IS NULL OR "account_status" NOT IN ('active', 'restricted', 'banned');
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_account_status_idx" ON "user" USING btree ("account_status");

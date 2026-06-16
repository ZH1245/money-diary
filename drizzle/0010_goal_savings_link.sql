ALTER TABLE "goals"
ADD COLUMN IF NOT EXISTS "savings_amount" text DEFAULT '0';
--> statement-breakpoint

UPDATE "goals"
SET "savings_amount" = '0'
WHERE "savings_amount" IS NULL;
--> statement-breakpoint

ALTER TABLE "goals"
ALTER COLUMN "savings_amount" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "savings"
ADD COLUMN IF NOT EXISTS "goal_id" integer;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "savings"
  ADD CONSTRAINT "savings_goal_id_goals_id_fk"
  FOREIGN KEY ("goal_id")
  REFERENCES "public"."goals"("id")
  ON DELETE set null
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "savings_goal_id_idx" ON "savings" USING btree ("goal_id");

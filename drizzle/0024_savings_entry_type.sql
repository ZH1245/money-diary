ALTER TABLE "savings" ADD COLUMN IF NOT EXISTS "entry_type" text DEFAULT 'deposit';
--> statement-breakpoint
UPDATE "savings" SET "entry_type" = 'deposit' WHERE "entry_type" IS NULL;
--> statement-breakpoint
ALTER TABLE "savings" ALTER COLUMN "entry_type" SET DEFAULT 'deposit';
--> statement-breakpoint
ALTER TABLE "savings" ALTER COLUMN "entry_type" SET NOT NULL;

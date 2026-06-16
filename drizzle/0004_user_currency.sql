ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD';
--> statement-breakpoint

UPDATE "user"
SET "currency" = 'USD'
WHERE "currency" IS NULL;
--> statement-breakpoint

ALTER TABLE "user"
ALTER COLUMN "currency" SET NOT NULL;

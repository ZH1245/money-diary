ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "source_amount" text;
--> statement-breakpoint

ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "source_currency" text DEFAULT 'USD';
--> statement-breakpoint

ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "exchange_rate" text DEFAULT '1';
--> statement-breakpoint

UPDATE "transactions"
SET "source_currency" = 'USD'
WHERE "source_currency" IS NULL;
--> statement-breakpoint

UPDATE "transactions"
SET "exchange_rate" = '1'
WHERE "exchange_rate" IS NULL;
--> statement-breakpoint

ALTER TABLE "transactions"
ALTER COLUMN "source_currency" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "transactions"
ALTER COLUMN "exchange_rate" SET NOT NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "transactions_source_currency_idx"
ON "transactions" USING btree ("source_currency");

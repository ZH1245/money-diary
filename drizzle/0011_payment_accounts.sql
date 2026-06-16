CREATE TABLE IF NOT EXISTS "payment_accounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "institution_slug" text,
  "account_type" text NOT NULL,
  "last_four" text,
  "note" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "payment_accounts"
  ADD CONSTRAINT "payment_accounts_user_id_user_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "public"."user"("id")
  ON DELETE cascade
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_accounts_user_id_idx" ON "payment_accounts" USING btree ("user_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "payment_accounts_account_type_idx" ON "payment_accounts" USING btree ("account_type");
--> statement-breakpoint

ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "payment_account_id" integer;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_payment_account_id_payment_accounts_id_fk"
  FOREIGN KEY ("payment_account_id")
  REFERENCES "public"."payment_accounts"("id")
  ON DELETE set null
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "transactions_payment_account_id_idx" ON "transactions" USING btree ("payment_account_id");
--> statement-breakpoint

ALTER TABLE "savings"
ADD COLUMN IF NOT EXISTS "payment_account_id" integer;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "savings"
  ADD CONSTRAINT "savings_payment_account_id_payment_accounts_id_fk"
  FOREIGN KEY ("payment_account_id")
  REFERENCES "public"."payment_accounts"("id")
  ON DELETE set null
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "savings_payment_account_id_idx" ON "savings" USING btree ("payment_account_id");

ALTER TABLE "categories"
ADD COLUMN "user_id" text;
--> statement-breakpoint

ALTER TABLE "categories"
ADD CONSTRAINT "categories_user_id_user_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

DROP INDEX IF EXISTS "categories_slug_unique_idx";
--> statement-breakpoint

CREATE UNIQUE INDEX "categories_user_slug_unique_idx"
ON "categories" USING btree ("user_id", "slug");
--> statement-breakpoint

CREATE INDEX "categories_user_id_idx"
ON "categories" USING btree ("user_id");
--> statement-breakpoint

INSERT INTO "categories" ("name", "slug", "kind")
VALUES
  ('Food', 'food', 'need'),
  ('Transport', 'transport', 'need'),
  ('Rent', 'rent', 'need'),
  ('Utilities', 'utilities', 'need'),
  ('Entertainment', 'entertainment', 'want'),
  ('Shopping', 'shopping', 'want'),
  ('Health', 'health', 'need'),
  ('Education', 'education', 'need'),
  ('Subscriptions', 'subscriptions', 'subscription'),
  ('Savings Transfer', 'savings-transfer', 'other')
ON CONFLICT ("user_id", "slug") DO NOTHING;

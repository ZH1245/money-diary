ALTER TABLE "categories"
ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "categories"
  ADD CONSTRAINT "categories_user_id_user_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "public"."user"("id")
  ON DELETE cascade
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DROP INDEX IF EXISTS "categories_slug_unique_idx";
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "categories_user_slug_unique_idx"
ON "categories" USING btree ("user_id", "slug");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "categories_user_id_idx"
ON "categories" USING btree ("user_id");
--> statement-breakpoint

INSERT INTO "categories" ("name", "slug", "kind")
SELECT seed.name, seed.slug, seed.kind
FROM (
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
) AS seed(name, slug, kind)
WHERE NOT EXISTS (
  SELECT 1
  FROM "categories" AS existing
  WHERE existing."slug" = seed.slug
    AND existing."user_id" IS NULL
);

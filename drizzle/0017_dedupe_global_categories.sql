-- Remove duplicate global categories (NULL user_id), keeping the lowest id per slug.
UPDATE "transactions" AS t
SET "category_id" = keeper.keep_id
FROM (
  SELECT "slug", MIN("id") AS keep_id
  FROM "categories"
  WHERE "user_id" IS NULL
  GROUP BY "slug"
) AS keeper
JOIN "categories" AS dup
  ON dup."slug" = keeper."slug"
  AND dup."user_id" IS NULL
  AND dup."id" <> keeper.keep_id
WHERE t."category_id" = dup."id";
--> statement-breakpoint

DELETE FROM "categories" AS dup
USING (
  SELECT "slug", MIN("id") AS keep_id
  FROM "categories"
  WHERE "user_id" IS NULL
  GROUP BY "slug"
) AS keeper
WHERE dup."user_id" IS NULL
  AND dup."slug" = keeper."slug"
  AND dup."id" <> keeper.keep_id;
--> statement-breakpoint

DROP INDEX IF EXISTS "categories_user_slug_unique_idx";
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "categories_user_slug_unique_idx"
ON "categories" USING btree ("user_id", "slug") NULLS NOT DISTINCT;

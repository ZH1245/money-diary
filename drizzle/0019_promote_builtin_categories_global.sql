-- Built-in categories are global when user_id IS NULL (visible to every user).
-- Remove personal duplicates when a global row with the same slug already exists.
DELETE FROM "categories" AS personal
WHERE personal."user_id" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "categories" AS global_row
    WHERE global_row."user_id" IS NULL
      AND global_row."slug" = personal."slug"
  );
--> statement-breakpoint

-- Promote original seeded slugs that were created under a user account to global scope.
UPDATE "categories"
SET "user_id" = NULL, "updated_at" = now()
WHERE "user_id" IS NOT NULL
  AND "slug" IN (
    'food',
    'transport',
    'rent',
    'utilities',
    'entertainment',
    'shopping',
    'health',
    'education',
    'subscriptions',
    'savings-transfer',
    'zakat',
    'fitrana',
    'fidya',
    'sadaqah',
    'kaffarah'
  );

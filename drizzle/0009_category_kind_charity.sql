UPDATE "categories"
SET "kind" = 'charity', "updated_at" = now()
WHERE "slug" IN ('zakat', 'fitrana', 'fidya', 'sadaqah', 'kaffarah')
  AND "user_id" IS NULL;

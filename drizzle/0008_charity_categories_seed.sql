INSERT INTO "categories" ("name", "slug", "kind")
SELECT seed.name, seed.slug, seed.kind
FROM (
  VALUES
    ('Zakat', 'zakat', 'charity'),
    ('Fitrana', 'fitrana', 'charity'),
    ('Fidya', 'fidya', 'charity'),
    ('Sadaqah', 'sadaqah', 'charity'),
    ('Kaffarah', 'kaffarah', 'charity')
) AS seed(name, slug, kind)
WHERE NOT EXISTS (
  SELECT 1
  FROM "categories" AS existing
  WHERE existing."slug" = seed.slug
    AND existing."user_id" IS NULL
);

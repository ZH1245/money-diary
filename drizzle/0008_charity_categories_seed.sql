INSERT INTO "categories" ("name", "slug", "kind")
VALUES
  ('Zakat', 'zakat', 'charity'),
  ('Fitrana', 'fitrana', 'charity'),
  ('Fidya', 'fidya', 'charity'),
  ('Sadaqah', 'sadaqah', 'charity'),
  ('Kaffarah', 'kaffarah', 'charity')
ON CONFLICT ("user_id", "slug") DO NOTHING;

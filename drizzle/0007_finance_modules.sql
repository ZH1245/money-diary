CREATE TABLE IF NOT EXISTS "savings" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "amount" text NOT NULL,
  "note" text,
  "saved_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "wishlist_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "target_amount" text NOT NULL,
  "current_amount" text DEFAULT '0' NOT NULL,
  "priority" text DEFAULT 'medium' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "goals" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "target_amount" text NOT NULL,
  "current_amount" text DEFAULT '0' NOT NULL,
  "target_date" timestamp,
  "status" text DEFAULT 'active' NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "savings_user_id_idx" ON "savings" ("user_id");
CREATE INDEX IF NOT EXISTS "savings_saved_at_idx" ON "savings" ("saved_at");
CREATE INDEX IF NOT EXISTS "savings_created_at_idx" ON "savings" ("created_at");

CREATE INDEX IF NOT EXISTS "wishlist_items_user_id_idx" ON "wishlist_items" ("user_id");
CREATE INDEX IF NOT EXISTS "wishlist_items_status_idx" ON "wishlist_items" ("status");
CREATE INDEX IF NOT EXISTS "wishlist_items_priority_idx" ON "wishlist_items" ("priority");
CREATE INDEX IF NOT EXISTS "wishlist_items_created_at_idx" ON "wishlist_items" ("created_at");

CREATE INDEX IF NOT EXISTS "goals_user_id_idx" ON "goals" ("user_id");
CREATE INDEX IF NOT EXISTS "goals_status_idx" ON "goals" ("status");
CREATE INDEX IF NOT EXISTS "goals_target_date_idx" ON "goals" ("target_date");
CREATE INDEX IF NOT EXISTS "goals_created_at_idx" ON "goals" ("created_at");

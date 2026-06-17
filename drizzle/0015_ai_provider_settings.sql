CREATE TABLE IF NOT EXISTS "ai_provider_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "provider" text DEFAULT 'ollama' NOT NULL,
  "base_url_encrypted" text NOT NULL,
  "model_encrypted" text NOT NULL,
  "api_key_encrypted" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ai_provider_settings"
  ADD CONSTRAINT "ai_provider_settings_user_id_user_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "public"."user"("id")
  ON DELETE cascade
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "ai_provider_settings_user_id_unique_idx"
ON "ai_provider_settings" USING btree ("user_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "ai_provider_settings_user_id_idx"
ON "ai_provider_settings" USING btree ("user_id");

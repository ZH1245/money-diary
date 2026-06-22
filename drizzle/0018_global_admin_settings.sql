ALTER TABLE "ai_provider_settings"
ADD COLUMN IF NOT EXISTS "use_global_provider" boolean DEFAULT true NOT NULL;
--> statement-breakpoint

ALTER TABLE "ai_provider_settings"
ALTER COLUMN "base_url_encrypted" DROP NOT NULL;
--> statement-breakpoint

ALTER TABLE "ai_provider_settings"
ALTER COLUMN "model_encrypted" DROP NOT NULL;
--> statement-breakpoint

ALTER TABLE "ai_provider_settings"
ADD COLUMN IF NOT EXISTS "is_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

ALTER TABLE "ai_provider_settings"
ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "ai_provider_settings"
  ADD CONSTRAINT "ai_provider_settings_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by")
  REFERENCES "public"."user"("id")
  ON DELETE set null
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "ai_provider_settings"
ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint

DROP INDEX IF EXISTS "ai_provider_settings_user_id_unique_idx";
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "ai_provider_settings_user_id_unique_idx"
ON "ai_provider_settings" USING btree ("user_id")
WHERE "user_id" IS NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "ai_provider_settings_global_unique_idx"
ON "ai_provider_settings" USING btree ((1))
WHERE "user_id" IS NULL;

CREATE TABLE IF NOT EXISTS "user_security_profile" (
  "user_id" text PRIMARY KEY NOT NULL,
  "recovery_email" text,
  "recovery_email_verified" boolean DEFAULT false NOT NULL,
  "question_one_key" text NOT NULL,
  "answer_one_hash" text NOT NULL,
  "question_two_key" text NOT NULL,
  "answer_two_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "user_security_profile"
  ADD CONSTRAINT "user_security_profile_user_id_user_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "public"."user"("id")
  ON DELETE cascade
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

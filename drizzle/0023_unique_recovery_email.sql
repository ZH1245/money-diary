UPDATE "user_security_profile"
SET "recovery_email" = lower(trim("recovery_email"))
WHERE "recovery_email" IS NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "user_security_profile_recovery_email_lower_unique_idx"
ON "user_security_profile" (lower("recovery_email"));

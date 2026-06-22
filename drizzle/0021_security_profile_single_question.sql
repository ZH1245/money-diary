UPDATE "user_security_profile" AS sp
SET "recovery_email" = u."email"
FROM "user" AS u
WHERE sp."user_id" = u."id"
  AND (sp."recovery_email" IS NULL OR btrim(sp."recovery_email") = '');
--> statement-breakpoint

ALTER TABLE "user_security_profile" ALTER COLUMN "recovery_email" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "user_security_profile" DROP COLUMN "question_two_key";
--> statement-breakpoint

ALTER TABLE "user_security_profile" DROP COLUMN "answer_two_hash";

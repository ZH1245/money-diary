ALTER TABLE "transactions"
ADD COLUMN "user_id" text;
--> statement-breakpoint

UPDATE "transactions"
SET "user_id" = (
  SELECT "id"
  FROM "user"
  ORDER BY "created_at" ASC
  LIMIT 1
)
WHERE "user_id" IS NULL;
--> statement-breakpoint

ALTER TABLE "transactions"
ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_user_id_user_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "transactions_user_id_idx"
ON "transactions" USING btree ("user_id");

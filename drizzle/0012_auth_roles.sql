CREATE TABLE "auth_roles" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "auth_roles" ("slug", "label", "description")
VALUES
	('user', 'User', 'Standard application user'),
	('admin', 'Admin', 'Full administrative access')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
UPDATE "user"
SET "role" = 'user'
WHERE "role" IS NULL OR "role" NOT IN ('user', 'admin');
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_auth_roles_slug_fk" FOREIGN KEY ("role") REFERENCES "public"."auth_roles"("slug") ON DELETE no action ON UPDATE no action;

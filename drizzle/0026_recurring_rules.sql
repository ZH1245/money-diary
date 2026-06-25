CREATE TABLE "recurring_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"amount" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"type" text NOT NULL,
	"category_id" integer,
	"payment_account_id" integer,
	"source" text,
	"note" text,
	"cadence" text DEFAULT 'monthly' NOT NULL,
	"next_run_at" timestamp NOT NULL,
	"last_run_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_payment_account_id_payment_accounts_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."payment_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_rules_user_id_idx" ON "recurring_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_rules_next_run_at_idx" ON "recurring_rules" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "recurring_rules_is_active_idx" ON "recurring_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "recurring_rules_payment_account_id_idx" ON "recurring_rules" USING btree ("payment_account_id");

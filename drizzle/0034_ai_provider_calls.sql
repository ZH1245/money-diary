CREATE TABLE "ai_provider_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" integer NOT NULL,
	"assistant_message_id" integer,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"session_id" text,
	"generation_id" text,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(18, 8) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_provider_calls" ADD CONSTRAINT "ai_provider_calls_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_provider_calls" ADD CONSTRAINT "ai_provider_calls_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_provider_calls" ADD CONSTRAINT "ai_provider_calls_assistant_message_id_ai_messages_id_fk" FOREIGN KEY ("assistant_message_id") REFERENCES "public"."ai_messages"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ai_provider_calls_user_id_idx" ON "ai_provider_calls" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "ai_provider_calls_conversation_id_idx" ON "ai_provider_calls" USING btree ("conversation_id");
--> statement-breakpoint
CREATE INDEX "ai_provider_calls_assistant_message_id_idx" ON "ai_provider_calls" USING btree ("assistant_message_id");
--> statement-breakpoint
CREATE INDEX "ai_provider_calls_created_at_idx" ON "ai_provider_calls" USING btree ("created_at");

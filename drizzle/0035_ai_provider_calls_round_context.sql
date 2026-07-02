ALTER TABLE "ai_provider_calls" ADD COLUMN "round_index" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_provider_calls" ADD COLUMN "round_type" text DEFAULT 'assistant' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_provider_calls" ADD COLUMN "tool_call_count" integer DEFAULT 0 NOT NULL;

ALTER TABLE "ai_provider_calls" ADD COLUMN "model_prompt_price_per_token" numeric(18, 12);
--> statement-breakpoint
ALTER TABLE "ai_provider_calls" ADD COLUMN "model_completion_price_per_token" numeric(18, 12);
--> statement-breakpoint
ALTER TABLE "ai_provider_calls" ADD COLUMN "prompt_cost_usd" numeric(18, 8) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_provider_calls" ADD COLUMN "completion_cost_usd" numeric(18, 8) DEFAULT '0' NOT NULL;

CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "title" text DEFAULT 'New chat' NOT NULL,
  "is_closed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_conversations_user_id_idx" ON "ai_conversations" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_conversations_updated_at_idx" ON "ai_conversations" ("updated_at");

DO $$ BEGIN
  ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "conversation_id" integer NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "metadata" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_messages_conversation_id_idx" ON "ai_messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "ai_messages_created_at_idx" ON "ai_messages" ("created_at");

DO $$ BEGIN
  ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk"
    FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

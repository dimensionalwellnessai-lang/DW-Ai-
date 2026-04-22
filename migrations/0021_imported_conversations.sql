CREATE TABLE IF NOT EXISTS "imported_conversations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "source" text NOT NULL,
  "original_title" text NOT NULL,
  "messages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "summary" text,
  "topics" text[],
  "suggested_actions" jsonb,
  "source_timestamp" timestamp,
  "imported_at" timestamp DEFAULT now(),
  "project_id" varchar REFERENCES "projects"("id")
);

CREATE INDEX IF NOT EXISTS "imported_conversations_user_idx" ON "imported_conversations" ("user_id");

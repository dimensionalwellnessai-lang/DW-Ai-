-- DW Trigger Protocol v1: real-time emotional regulation event log.
CREATE TABLE IF NOT EXISTS "trigger_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "feeling" text NOT NULL,
  "assumption" text,
  "had_proof" boolean,
  "root_note" text,
  "reframe" text,
  "response_choice" text,
  "pause_minutes" integer,
  "outcome" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "trigger_events_user_created_idx"
  ON "trigger_events" ("user_id", "created_at" DESC);

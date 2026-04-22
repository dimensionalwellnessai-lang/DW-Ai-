-- Daily Briefs: one DW-authored "Today" / "Tonight" card per user per local day.
-- Cached for the rest of the day so the home screen renders instantly and we
-- only call the LLM on first open or manual regenerate.

CREATE TABLE IF NOT EXISTS "daily_briefs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date_key" text NOT NULL,
  "variant" text NOT NULL,
  "summary_text" text NOT NULL,
  "bullets" jsonb NOT NULL,
  "generated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_briefs_user_date_variant_idx"
  ON "daily_briefs" ("user_id", "date_key", "variant");

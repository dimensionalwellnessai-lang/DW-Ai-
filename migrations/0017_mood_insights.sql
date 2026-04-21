-- Mood Tracker v2: timeline + correlations + journal-on-mood.
-- Adds:
--   * dw_journal_entries.mood_log_id  – nullable FK linking a journal entry
--     back to the mood log that triggered it (journal-on-mood prompt flow).
--   * mood_insights table             – cached correlation results (Pearson r
--     + effect size + sample size) recomputed daily / on-demand.

ALTER TABLE "dw_journal_entries"
  ADD COLUMN IF NOT EXISTS "mood_log_id" varchar
  REFERENCES "mood_logs"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "mood_insights" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "factor" text NOT NULL,
  "label" text NOT NULL,
  "effect" real NOT NULL,
  "sample_size" integer NOT NULL,
  "correlation" real,
  "confidence" text NOT NULL,
  "description" text,
  "computed_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "mood_insights_user_factor_idx"
  ON "mood_insights" ("user_id", "factor");

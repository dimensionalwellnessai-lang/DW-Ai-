-- Daily brief per-user preferences.
-- One row per user. Booleans gate which bullet kinds the brief is allowed
-- to surface; `tone_note` is a free-text instruction (e.g. "lean spiritual",
-- "always include a sleep number, never include money").
--
-- This table was previously created implicitly by `drizzle-kit push --force`
-- in the post-merge step. Now that bootstrap is the sole dev migration entry
-- point (Task #145), the table needs an explicit migration so freshly cloned
-- dev DBs are not missing it.

CREATE TABLE IF NOT EXISTS "daily_brief_preferences" (
  "id"                   varchar     PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"              varchar     NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "include_mood"         boolean     NOT NULL DEFAULT true,
  "include_sleep"        boolean     NOT NULL DEFAULT true,
  "include_finance"      boolean     NOT NULL DEFAULT true,
  "include_relationship" boolean     NOT NULL DEFAULT true,
  "include_spirit"       boolean     NOT NULL DEFAULT true,
  "include_plan"         boolean     NOT NULL DEFAULT true,
  "include_trigger"      boolean     NOT NULL DEFAULT true,
  "tone_note"            text,
  "updated_at"           timestamp   NOT NULL DEFAULT now()
);

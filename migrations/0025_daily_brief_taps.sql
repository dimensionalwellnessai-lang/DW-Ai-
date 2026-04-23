-- Daily brief tap telemetry (Task #115)
-- Append-only log of which Today brief bullets each user actually tapped.
-- Lets DW see kind/route engagement and tune brief generation.

CREATE TABLE IF NOT EXISTS "daily_brief_taps" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date_key" text NOT NULL,
  "variant" text NOT NULL,
  "bullet_kind" text NOT NULL,
  "route" text NOT NULL,
  "importance" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_brief_taps_user_date_idx"
  ON "daily_brief_taps" ("user_id", "date_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_brief_taps_kind_idx"
  ON "daily_brief_taps" ("bullet_kind");

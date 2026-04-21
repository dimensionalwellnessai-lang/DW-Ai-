-- Spiritual workspace v1: meditation library, sessions, prayer entries.
CREATE TABLE IF NOT EXISTS "meditation_library" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "theme" text NOT NULL,
  "duration_minutes" integer NOT NULL,
  "script_text" text NOT NULL,
  "audio_url" text,
  "description" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "meditation_library_theme_idx"
  ON "meditation_library" ("theme", "duration_minutes");

CREATE TABLE IF NOT EXISTS "meditation_sessions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "library_id" varchar REFERENCES "meditation_library"("id") ON DELETE SET NULL,
  "theme_override" text,
  "duration_sec" integer NOT NULL,
  "completed_at" timestamp DEFAULT now() NOT NULL,
  "mood_before" integer,
  "mood_after" integer,
  "notes" text
);

CREATE INDEX IF NOT EXISTS "meditation_sessions_user_completed_idx"
  ON "meditation_sessions" ("user_id", "completed_at" DESC);

CREATE TABLE IF NOT EXISTS "prayer_entries" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "intention" text,
  "gratitude_list" text[],
  "share_collective" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "prayer_entries_user_created_idx"
  ON "prayer_entries" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "prayer_entries_collective_idx"
  ON "prayer_entries" ("share_collective", "created_at" DESC)
  WHERE "share_collective" = true;

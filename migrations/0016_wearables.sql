-- Wearable + Screen Time Manager v1.
-- Extends existing wearable_devices/wearable_data with multi-source ingest
-- columns and adds screen_time_usage + wearable_sync_jobs.

ALTER TABLE "wearable_devices"
  ADD COLUMN IF NOT EXISTS "source" text,
  ADD COLUMN IF NOT EXISTS "access_token_enc" text,
  ADD COLUMN IF NOT EXISTS "refresh_token_enc" text,
  ADD COLUMN IF NOT EXISTS "token_expires_at" timestamp;

ALTER TABLE "wearable_data"
  ADD COLUMN IF NOT EXISTS "source" text,
  ADD COLUMN IF NOT EXISTS "source_record_id" text,
  ADD COLUMN IF NOT EXISTS "metric_kind" text,
  ADD COLUMN IF NOT EXISTS "metric_value" real,
  ADD COLUMN IF NOT EXISTS "recorded_at" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "wearable_data_user_source_record_idx"
  ON "wearable_data" ("user_id", "source", "source_record_id");

CREATE TABLE IF NOT EXISTS "screen_time_usage" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "source" text NOT NULL DEFAULT 'screen_time',
  "date_key" text NOT NULL,
  "total_minutes" integer NOT NULL DEFAULT 0,
  "by_category" jsonb,
  "by_app" jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "screen_time_usage_user_date_source_idx"
  ON "screen_time_usage" ("user_id", "date_key", "source");

CREATE TABLE IF NOT EXISTS "wearable_sync_jobs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "source" text NOT NULL,
  "status" text NOT NULL DEFAULT 'idle',
  "last_sync_at" timestamp,
  "error_text" text,
  "records_imported" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "wearable_sync_jobs_user_source_idx"
  ON "wearable_sync_jobs" ("user_id", "source");

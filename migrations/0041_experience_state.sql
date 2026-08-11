-- Migration 0041: feed interaction states, reminder response states, richer tour progress, what's-new seen tracking

ALTER TABLE feed_interactions
  ADD COLUMN IF NOT EXISTS content_id TEXT,
  ADD COLUMN IF NOT EXISTS collection_key TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS response_state TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMP,
  ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS no_response_at TIMESTAMP;

ALTER TABLE tour_progress
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_step INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_steps INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS whats_new_seen (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, version)
);

CREATE INDEX IF NOT EXISTS feed_interactions_user_action_idx ON feed_interactions (user_id, action);
CREATE INDEX IF NOT EXISTS reminders_user_response_state_idx ON reminders (user_id, response_state);
CREATE INDEX IF NOT EXISTS tour_progress_user_updated_idx ON tour_progress (user_id, updated_at);

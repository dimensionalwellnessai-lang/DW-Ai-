-- Migration 0040: dwai lifecycle routing, capacity check-ins, tour progress, return events

-- Add last_active_at to users for lifecycle state detection
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- today_checkins: one row per user per calendar day
CREATE TABLE IF NOT EXISTS today_checkins (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  capacity TEXT NOT NULL DEFAULT 'normal',
  completed_action_ids TEXT[] DEFAULT '{}',
  micro_reflection TEXT,
  minimum_day_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, date_key)
);

-- tour_progress: tracks which tours each user has completed
CREATE TABLE IF NOT EXISTS tour_progress (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tour_id TEXT NOT NULL,
  completed_at TIMESTAMP,
  replay_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, tour_id)
);

-- return_events: log long-away re-entry paths
CREATE TABLE IF NOT EXISTS return_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  days_away INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

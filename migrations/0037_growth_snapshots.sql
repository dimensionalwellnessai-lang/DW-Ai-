-- Migration 0037: Growth snapshots for Level-Up metrics
-- One row per user per UTC day with computed level-up metrics (milestone
-- progress, habit consistency, goal progress, challenge check-ins, wearable
-- averages) so trend charts don't have to recompute history.

CREATE TABLE IF NOT EXISTS growth_snapshots (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_key text NOT NULL,
  role_map_id varchar REFERENCES role_maps(id) ON DELETE SET NULL,
  current_level integer,
  milestones_done integer NOT NULL DEFAULT 0,
  milestones_total integer NOT NULL DEFAULT 0,
  level_progress_pct integer NOT NULL DEFAULT 0,
  habit_consistency_pct integer NOT NULL DEFAULT 0,
  goal_progress_avg integer NOT NULL DEFAULT 0,
  challenge_checkins_7d integer NOT NULL DEFAULT 0,
  wearable jsonb,
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS growth_snapshots_user_date_idx
  ON growth_snapshots (user_id, date_key);

CREATE INDEX IF NOT EXISTS growth_snapshots_user_idx
  ON growth_snapshots (user_id, date_key DESC);

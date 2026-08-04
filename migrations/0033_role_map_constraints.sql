-- Migration 0033: Role Map integrity constraints
-- Enforce one active role map and one active interview per user at the DB
-- level (the app-level checks alone are racy under concurrent requests).

CREATE UNIQUE INDEX IF NOT EXISTS role_maps_one_active_per_user_idx
  ON role_maps (user_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS role_map_interviews_one_active_per_user_idx
  ON role_map_interviews (user_id)
  WHERE status = 'active';

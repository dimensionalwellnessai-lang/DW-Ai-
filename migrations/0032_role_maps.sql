-- Migration 0032: Role Maps (Level Up — personalized role maps via AI interview)
-- Adds:
--   1. role_maps table — the synthesized role map (target role, level ladder, status)
--   2. role_map_interviews table — interview transcript/state per user

CREATE TABLE IF NOT EXISTS role_maps (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_role text NOT NULL,
  identity_statement text,
  gap_summary text,
  current_level integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  levels jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS role_maps_user_id_idx ON role_maps (user_id);

CREATE TABLE IF NOT EXISTS role_map_interviews (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_map_id varchar REFERENCES role_maps(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS role_map_interviews_user_id_idx ON role_map_interviews (user_id);

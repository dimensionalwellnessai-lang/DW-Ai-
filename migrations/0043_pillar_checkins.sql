-- Migration 0043: pillar check-ins (conversational switch check-ins)

-- pillar_checkins: one row per DW check-in on a life dimension/pillar.
-- Written by POST /api/pillar-checkins; read by My Progress switches and
-- the Life Blueprint "last check-in" line.
CREATE TABLE IF NOT EXISTS pillar_checkins (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pillar_id TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  checked_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pillar_checkins_user_pillar_idx
  ON pillar_checkins (user_id, pillar_id, checked_at DESC);

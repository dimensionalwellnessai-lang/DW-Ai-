-- Migration 0042: energy transmutation practices table

-- energy_practices: user-submitted situations with AI reframes and exercises
CREATE TABLE IF NOT EXISTS energy_practices (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  situation TEXT NOT NULL,
  reframe TEXT,
  exercise TEXT,
  added_to_today BOOLEAN DEFAULT FALSE,
  saved BOOLEAN DEFAULT FALSE,
  routine_cadence TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

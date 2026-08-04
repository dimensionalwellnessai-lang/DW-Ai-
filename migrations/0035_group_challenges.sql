-- Migration 0035: Monthly level-up group challenges
-- Challenges, cohort participants, and daily check-ins. Seeds the current
-- month's challenge (idempotent by month+title).

CREATE TABLE IF NOT EXISTS group_challenges (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  theme text,
  month text NOT NULL,
  start_date timestamp NOT NULL,
  end_date timestamp NOT NULL,
  activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_checkins integer NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'published',
  discussion_post_id varchar,
  badge_title text,
  created_by varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_challenges_month_idx ON group_challenges (month, status);

CREATE TABLE IF NOT EXISTS group_challenge_participants (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id varchar NOT NULL REFERENCES group_challenges(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamp DEFAULT now(),
  left_at timestamp,
  completed_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS group_challenge_participants_unique_idx
  ON group_challenge_participants (challenge_id, user_id);

CREATE TABLE IF NOT EXISTS group_challenge_checkins (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id varchar NOT NULL REFERENCES group_challenges(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_key text NOT NULL,
  activity_id text,
  note text,
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS group_challenge_checkins_unique_idx
  ON group_challenge_checkins (challenge_id, user_id, date_key);

-- Seed the current month's challenge so the hub isn't empty on launch.
INSERT INTO group_challenges (title, description, theme, month, start_date, end_date, activities, target_checkins, badge_title)
SELECT
  'Morning Momentum',
  'A month of showing up for your mornings. Pick one morning practice each day — movement, planning, or stillness — and check in. Small mornings, big momentum.',
  '30 days of morning routines',
  to_char(now(), 'YYYY-MM'),
  date_trunc('month', now()),
  (date_trunc('month', now()) + interval '1 month' - interval '1 second'),
  '[{"id":"move","title":"Morning movement","description":"5+ minutes of stretching, walking, or exercise"},{"id":"plan","title":"Plan your day","description":"Write down your top 3 priorities"},{"id":"still","title":"Morning stillness","description":"Meditation, breathwork, or quiet coffee without your phone"}]'::jsonb,
  20,
  'Morning Momentum Finisher'
WHERE NOT EXISTS (
  SELECT 1 FROM group_challenges WHERE month = to_char(now(), 'YYYY-MM') AND title = 'Morning Momentum'
);

-- Migration 0034: Community message boards
-- Boards, posts, threaded replies, reactions, reports, blocks, and opt-in
-- community profiles. Boards are seeded here (idempotent by slug).

CREATE TABLE IF NOT EXISTS community_profiles (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_emoji text NOT NULL DEFAULT '🌱',
  bio text,
  share_role_map_level boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_boards (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  dimension text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_posts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id varchar NOT NULL REFERENCES community_boards(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'visible',
  reply_count integer NOT NULL DEFAULT 0,
  reaction_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_posts_board_activity_idx
  ON community_posts (board_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_user_idx ON community_posts (user_id);

CREATE TABLE IF NOT EXISTS community_replies (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id varchar NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_reply_id varchar,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'visible',
  reaction_count integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_replies_post_idx ON community_replies (post_id);

CREATE TABLE IF NOT EXISTS community_reactions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id varchar NOT NULL,
  kind text NOT NULL DEFAULT 'encourage',
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS community_reactions_unique_idx
  ON community_reactions (user_id, target_type, target_id, kind);

CREATE TABLE IF NOT EXISTS community_reports (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id varchar NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_blocks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS community_blocks_unique_idx
  ON community_blocks (blocker_id, blocked_user_id);

-- Seed topic boards (idempotent by slug).
INSERT INTO community_boards (slug, name, description, icon, dimension, sort_order) VALUES
  ('leveling-up', 'Leveling Up', 'Role maps, next levels, and becoming who you want to be', 'trending-up', NULL, 0),
  ('wins-encouragement', 'Wins & Encouragement', 'Share a win, big or small — and cheer each other on', 'party-popper', NULL, 1),
  ('habits-consistency', 'Habits & Consistency', 'Streaks, systems, and showing up daily', 'repeat', NULL, 2),
  ('body-energy', 'Body & Energy', 'Fitness, sleep, recovery, and physical wellness', 'dumbbell', 'physical', 3),
  ('mind-emotions', 'Mind & Emotions', 'Mental wellness, stress, and emotional growth', 'brain', 'mental', 4),
  ('relationships-connection', 'Relationships & Connection', 'People, boundaries, and social wellness', 'heart', 'social', 5),
  ('money-growth', 'Money & Growth', 'Financial wellness, saving, and earning', 'wallet', 'financial', 6),
  ('purpose-career', 'Purpose & Career', 'Work, calling, and occupational wellness', 'briefcase', 'occupational', 7),
  ('spirit-meaning', 'Spirit & Meaning', 'Meditation, spirituality, and inner life', 'sparkles', 'spiritual', 8),
  ('learning-curiosity', 'Learning & Curiosity', 'Books, skills, and intellectual growth', 'book-open', 'intellectual', 9)
ON CONFLICT (slug) DO NOTHING;

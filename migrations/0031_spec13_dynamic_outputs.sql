-- Migration 0031: Spec 13 dynamic onboarding outputs & learning threads
-- Adds:
--   1. projects.data_source, projects.explain_why  (PR A — source metadata on projects)
--   2. onboarding_profiles.dismissed_progressive_prompts  (PR B — track dismissed follow-ups)
--   3. life_system_projects.linked_path_tag, linked_plan_title, data_source, explain_why  (Spec 13 relationship + source metadata)
--   4. learning_threads table  (PR C — Guidance Conversations)

-- 1. Source metadata on the projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS data_source text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS explain_why text;

-- 2. Dismissed progressive prompts on onboarding_profiles
ALTER TABLE onboarding_profiles
  ADD COLUMN IF NOT EXISTS dismissed_progressive_prompts text[];

-- 3. Relationship + source metadata on life_system_projects
ALTER TABLE life_system_projects
  ADD COLUMN IF NOT EXISTS linked_path_tag text,
  ADD COLUMN IF NOT EXISTS linked_plan_title text,
  ADD COLUMN IF NOT EXISTS data_source text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS explain_why text;

-- 4. Learning threads table (Guidance — Conversations feature)
CREATE TABLE IF NOT EXISTS learning_threads (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  messages jsonb NOT NULL DEFAULT '[]',
  tags text[],
  linked_to_type text,
  linked_to_id varchar,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_threads_user_id_idx ON learning_threads (user_id);

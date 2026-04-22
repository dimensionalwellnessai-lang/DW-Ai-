-- Plans Workspace (Task #94)
-- Adds project status / activity / summary, plus milestones + artifacts tables.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS last_activity_at timestamp DEFAULT now();
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS summary text;

CREATE TABLE IF NOT EXISTS project_milestones (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id varchar NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date timestamp,
  done_at timestamp,
  "order" integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_milestones_project_id_idx
  ON project_milestones(project_id);

CREATE TABLE IF NOT EXISTS project_artifacts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id varchar NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref_id varchar,
  url text,
  title text NOT NULL,
  added_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_artifacts_project_id_idx
  ON project_artifacts(project_id);

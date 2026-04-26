ALTER TABLE project_artifacts
  ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE project_artifacts
  ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE project_artifacts
  ADD COLUMN IF NOT EXISTS excerpt text;

-- Persist the upcoming-reminders panel "look ahead" horizon (Today / +1 / +3
-- / +7 days) on the user's notification preferences so the choice carries
-- across phone, tablet, and desktop instead of being trapped in each
-- browser's localStorage.

ALTER TABLE "notification_preferences"
  ADD COLUMN IF NOT EXISTS "preview_days_ahead" integer DEFAULT 0;

-- Daily relationship nudges: a per-user toggle for the gentle reminder that
-- surfaces the most urgent overdue contact or open repair once a day. Users
-- who want to mute these without disabling all accountability notifications
-- flip this column off from Accountability Settings.

ALTER TABLE "notification_preferences"
  ADD COLUMN IF NOT EXISTS "relationship_nudges_enabled" boolean DEFAULT true;

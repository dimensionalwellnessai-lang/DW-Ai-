-- Migration 0036: Guide check-ins mute toggle
-- DW proactively offers a coaching check-in when level-up progress stalls or
-- a milestone is close. Users can mute it independently.

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS guide_checkins_enabled boolean DEFAULT true;

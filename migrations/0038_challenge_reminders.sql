-- Migration 0038: Group-challenge check-in reminder mute toggle
-- Participants of an active group challenge who haven't checked in yet today
-- get one gentle evening reminder. Users can mute it independently.

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS challenge_reminders_enabled boolean DEFAULT true;

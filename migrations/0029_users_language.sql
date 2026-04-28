-- Add the optional `language` preference column to `users` so a chosen
-- language follows a user across devices.
--
-- Pure additive: a single nullable text column with no FK and no default.
-- A NULL value means "no explicit preference, fall back to navigator
-- detection on the client", which is the same behaviour as before this
-- column existed. No data movement, no destructive ALTER.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "language" text;

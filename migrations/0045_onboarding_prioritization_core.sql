ALTER TABLE "onboarding_profiles"
ADD COLUMN IF NOT EXISTS "profile_context" jsonb,
ADD COLUMN IF NOT EXISTS "priority_snapshot" jsonb;

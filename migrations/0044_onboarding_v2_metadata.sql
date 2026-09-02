ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "onboarding_version" varchar,
ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp,
ADD COLUMN IF NOT EXISTS "onboarding_source" varchar;

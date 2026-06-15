-- Migration: Structured onboarding output fields (Spec 13 dynamic app population)
-- Adds new columns to onboarding_profiles for persisting structured data
-- extracted from the conversational onboarding flow.

ALTER TABLE "onboarding_profiles"
  ADD COLUMN IF NOT EXISTS "desired_feelings" text[],
  ADD COLUMN IF NOT EXISTS "current_state_tags" text[],
  ADD COLUMN IF NOT EXISTS "active_life_areas" text[],
  ADD COLUMN IF NOT EXISTS "barrier_tags" text[],
  ADD COLUMN IF NOT EXISTS "support_needs" text[],
  ADD COLUMN IF NOT EXISTS "curiosity_topics" text[],
  ADD COLUMN IF NOT EXISTS "generated_summary" text,
  ADD COLUMN IF NOT EXISTS "generated_direction" text,
  ADD COLUMN IF NOT EXISTS "current_capacity" text,
  ADD COLUMN IF NOT EXISTS "tone_preference" text,
  ADD COLUMN IF NOT EXISTS "detail_preference" text,
  ADD COLUMN IF NOT EXISTS "uncertainty_flags" jsonb,
  ADD COLUMN IF NOT EXISTS "suggested_structure" jsonb,
  ADD COLUMN IF NOT EXISTS "onboarding_version" varchar DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS "completed_at" timestamp;

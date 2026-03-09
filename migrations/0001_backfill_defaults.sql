-- Custom SQL migration file, put your code below! --

-- Idempotent backfill: set default values for nullable columns that have
-- column-level defaults so that existing NULL rows are brought in-line with
-- the schema defaults. Each UPDATE is a no-op when no NULLs exist.

-- users: ensure every row has a role and onboarding_completed value
UPDATE "users"
SET "role" = 'user'
WHERE "role" IS NULL;

UPDATE "users"
SET "onboarding_completed" = false
WHERE "onboarding_completed" IS NULL;

-- habits / goals: ensure is_active and data_source are set
UPDATE "habits"
SET "is_active" = true
WHERE "is_active" IS NULL;

UPDATE "habits"
SET "data_source" = 'user'
WHERE "data_source" IS NULL;

UPDATE "habits"
SET "streak" = 0
WHERE "streak" IS NULL;

UPDATE "goals"
SET "is_active" = true
WHERE "is_active" IS NULL;

UPDATE "goals"
SET "data_source" = 'user'
WHERE "data_source" IS NULL;

UPDATE "goals"
SET "progress" = 0
WHERE "progress" IS NULL;

UPDATE "goals"
SET "target_value" = 100
WHERE "target_value" IS NULL;

-- dw_followups: status default
UPDATE "dw_followups"
SET "status" = 'pending'
WHERE "status" IS NULL;

-- elevation_plan_actions: is_completed default
UPDATE "elevation_plan_actions"
SET "is_completed" = false
WHERE "is_completed" IS NULL;

-- activity_completions: completed default
UPDATE "activity_completions"
SET "completed" = false
WHERE "completed" IS NULL;

-- user_learning_profile: learning_enabled default
UPDATE "user_learning_profile"
SET "learning_enabled" = true
WHERE "learning_enabled" IS NULL;

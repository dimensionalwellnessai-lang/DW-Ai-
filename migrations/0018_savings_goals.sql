-- Personal savings goals on the Finances workspace.
-- Lightweight per-user targets (e.g. "Emergency fund", "Hawaii trip") with a
-- saved-so-far amount and an optional target date. Progress is computed on
-- the client as currentAmount / targetAmount.

CREATE TABLE IF NOT EXISTS "savings_goals" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "target_amount" real NOT NULL,
  "current_amount" real NOT NULL DEFAULT 0,
  "target_date" text,
  "note" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "savings_goals_user_idx" ON "savings_goals" ("user_id");

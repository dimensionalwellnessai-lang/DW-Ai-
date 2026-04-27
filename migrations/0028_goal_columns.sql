-- Backfill two nullable columns and one index that were declared in
-- `shared/schema.ts` but never landed in `migrations/`. The schema-drift
-- check added in Task #144 surfaced both as missing.
--
-- Both columns are simple optional varchar refs (no FK in the schema),
-- so this is a pure ADD COLUMN with no data movement and no destructive
-- ALTER. The transactions_goal_idx index is the partner index drizzle
-- declares alongside `transactions.goalId` so look-ups by goal stay
-- cheap.

ALTER TABLE "challenges"
  ADD COLUMN IF NOT EXISTS "linked_goal_id" varchar;
--> statement-breakpoint
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "goal_id" varchar;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_goal_idx"
  ON "transactions" ("goal_id");

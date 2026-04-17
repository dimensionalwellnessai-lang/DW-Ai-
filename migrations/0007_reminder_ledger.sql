CREATE TABLE IF NOT EXISTS "reminder_ledger" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tag" text NOT NULL,
  "kind" text NOT NULL,
  "bucket" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "reminder_ledger_unique_idx"
  ON "reminder_ledger" ("user_id", "tag", "kind", "bucket");

CREATE INDEX IF NOT EXISTS "reminder_ledger_created_at_idx"
  ON "reminder_ledger" ("created_at");

-- Stripe paywall + free-tier usage meters (Task #96)
-- Adds Stripe-related columns to users and creates the usage_meters table
-- used by requirePaidOrQuota to enforce daily quotas on AI-heavy routes.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "subscription_period_end" timestamp,
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" text,
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text,
  ADD COLUMN IF NOT EXISTS "stripe_price_id" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripe_customer_id_idx"
  ON "users" ("stripe_customer_id")
  WHERE "stripe_customer_id" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_meters" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date_key" text NOT NULL,
  "kind" text NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usage_meters_user_date_kind_idx"
  ON "usage_meters" ("user_id", "date_key", "kind");

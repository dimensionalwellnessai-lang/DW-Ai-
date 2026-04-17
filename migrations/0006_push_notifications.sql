-- Singleton VAPID keys row (the push_subscriptions table is created elsewhere)
CREATE TABLE IF NOT EXISTS "vapid_keys" (
  "id" varchar PRIMARY KEY,
  "public_key" text NOT NULL,
  "private_key" text NOT NULL,
  "subject" text NOT NULL,
  "created_at" timestamp DEFAULT NOW()
);

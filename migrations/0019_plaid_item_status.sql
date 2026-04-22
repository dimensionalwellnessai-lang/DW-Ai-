-- Per-item Plaid health tracking: status, last error, last success, and a
-- nudge marker so we don't repeatedly notify users about the same broken
-- item. See server/plaid-sync.ts and server/routes/plaid.ts.
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ok';
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "last_error" text;
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "last_error_code" text;
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "last_error_at" timestamp;
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "last_success_at" timestamp;
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "error_notified_at" timestamp;

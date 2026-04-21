-- Finances workspace: accounts, transactions, budgets, holdings, net-worth
-- snapshots, and Plaid items for automated bank sync.

CREATE TABLE IF NOT EXISTS "financial_accounts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "institution" text,
  "current_balance" real DEFAULT 0,
  "currency" text DEFAULT 'USD',
  "plaid_account_id" text,
  "plaid_item_id" varchar,
  "is_manual" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "financial_accounts_user_idx" ON "financial_accounts" ("user_id");

CREATE TABLE IF NOT EXISTS "transactions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_id" varchar REFERENCES "financial_accounts"("id") ON DELETE SET NULL,
  "amount" real NOT NULL,
  "currency" text DEFAULT 'USD',
  "category" text NOT NULL,
  "merchant" text,
  "note" text,
  "date" text NOT NULL,
  "source" text NOT NULL DEFAULT 'manual',
  "plaid_transaction_id" text,
  "pending" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_plaid_txn_idx"
  ON "transactions" ("plaid_transaction_id");
CREATE INDEX IF NOT EXISTS "transactions_user_date_idx"
  ON "transactions" ("user_id", "date" DESC);

CREATE TABLE IF NOT EXISTS "budgets" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category" text NOT NULL,
  "monthly_limit" real NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "budgets_user_category_idx"
  ON "budgets" ("user_id", "category");

CREATE TABLE IF NOT EXISTS "investment_holdings" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "ticker" text,
  "name" text NOT NULL,
  "type" text NOT NULL DEFAULT 'stock',
  "shares" real DEFAULT 0,
  "cost_basis" real,
  "current_price" real,
  "manual_value" real,
  "last_quote_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "investment_holdings_user_idx"
  ON "investment_holdings" ("user_id");

CREATE TABLE IF NOT EXISTS "net_worth_snapshots" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" text NOT NULL,
  "assets" real NOT NULL DEFAULT 0,
  "liabilities" real NOT NULL DEFAULT 0,
  "net_worth" real NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "net_worth_user_date_idx"
  ON "net_worth_snapshots" ("user_id", "date");

CREATE TABLE IF NOT EXISTS "plaid_items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "item_id" text NOT NULL UNIQUE,
  "access_token" text NOT NULL,
  "institution_id" text,
  "institution_name" text,
  "cursor" text,
  "last_sync_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "plaid_items_user_idx" ON "plaid_items" ("user_id");

-- Relationships expansion: contact frequency target, boundaries / repairs /
-- appreciations, family / shared hub groups, and a cached DW insight log.
ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "contact_frequency_days" integer;

CREATE TABLE IF NOT EXISTS "relationship_boundaries" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "person_id" varchar NOT NULL REFERENCES "people"("id") ON DELETE CASCADE,
  "rule" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "rel_boundaries_user_idx" ON "relationship_boundaries" ("user_id");
CREATE INDEX IF NOT EXISTS "rel_boundaries_person_idx" ON "relationship_boundaries" ("person_id");

CREATE TABLE IF NOT EXISTS "relationship_repairs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "person_id" varchar NOT NULL REFERENCES "people"("id") ON DELETE CASCADE,
  "issue" text NOT NULL,
  "planned_action" text,
  "due_date" timestamp,
  "status" text NOT NULL DEFAULT 'open',
  "created_at" timestamp DEFAULT now(),
  "resolved_at" timestamp
);
CREATE INDEX IF NOT EXISTS "rel_repairs_user_idx" ON "relationship_repairs" ("user_id");
CREATE INDEX IF NOT EXISTS "rel_repairs_person_idx" ON "relationship_repairs" ("person_id");

CREATE TABLE IF NOT EXISTS "relationship_appreciations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "person_id" varchar NOT NULL REFERENCES "people"("id") ON DELETE CASCADE,
  "note" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "rel_appreciations_user_idx" ON "relationship_appreciations" ("user_id");
CREATE INDEX IF NOT EXISTS "rel_appreciations_person_idx" ON "relationship_appreciations" ("person_id");

CREATE TABLE IF NOT EXISTS "people_groups" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "name" text NOT NULL,
  "kind" text DEFAULT 'other',
  "description" text,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "people_groups_user_idx" ON "people_groups" ("user_id");

CREATE TABLE IF NOT EXISTS "people_group_members" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_id" varchar NOT NULL REFERENCES "people_groups"("id") ON DELETE CASCADE,
  "person_id" varchar NOT NULL REFERENCES "people"("id") ON DELETE CASCADE,
  "partner_user_id" varchar REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "people_group_members_group_idx" ON "people_group_members" ("group_id");

CREATE TABLE IF NOT EXISTS "group_shared_items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_id" varchar NOT NULL REFERENCES "people_groups"("id") ON DELETE CASCADE,
  "author_user_id" varchar NOT NULL REFERENCES "users"("id"),
  "kind" text NOT NULL DEFAULT 'note',
  "payload" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "group_shared_items_group_idx" ON "group_shared_items" ("group_id", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "relationship_insights" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "kind" text NOT NULL,
  "person_id" varchar REFERENCES "people"("id") ON DELETE CASCADE,
  "group_id" varchar REFERENCES "people_groups"("id") ON DELETE CASCADE,
  "message" text NOT NULL,
  "cta" jsonb,
  "is_dismissed" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "rel_insights_user_idx" ON "relationship_insights" ("user_id", "created_at" DESC);

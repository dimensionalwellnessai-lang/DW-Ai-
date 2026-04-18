-- Life System: three-level pillar model + projects + generated documents.

CREATE TABLE IF NOT EXISTS "life_system_pillars" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "pillar_id" text NOT NULL,
  "level" text NOT NULL,
  "enabled" boolean DEFAULT true,
  "content" jsonb,
  "sort_order" integer DEFAULT 0,
  "updated_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "life_system_pillars_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "life_system_pillars_user_pillar_idx"
  ON "life_system_pillars" ("user_id", "pillar_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "life_system_projects" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "current_focus" text,
  "weekly_cadence" text,
  "next_action" text,
  "status" text DEFAULT 'active',
  "sort_order" integer DEFAULT 0,
  "updated_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "life_system_projects_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "life_system_documents" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "content" jsonb NOT NULL,
  "generated_at" timestamp DEFAULT now(),
  CONSTRAINT "life_system_documents_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

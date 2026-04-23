-- DW Role Picker telemetry — logs every adaptive lane pick so we can measure
-- usage and override rate per lane and turn findings into rule updates.
CREATE TABLE IF NOT EXISTS "dw_role_picks" (
  "id"                varchar       PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"           varchar       NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "surface"           text          NOT NULL,
  "mode"              text          NOT NULL,
  "source"            text          NOT NULL,
  "confidence"        numeric(4,3)  NOT NULL,
  "reason"            text,
  "locked"            boolean       NOT NULL DEFAULT false,
  "applied"           boolean       NOT NULL DEFAULT false,
  "message_hash"      text,
  "message_length"    integer,
  "overridden_by_mode" text,
  "overridden_at"     timestamp,
  "created_at"        timestamp     DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dw_role_picks_user_created_idx"
  ON "dw_role_picks" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "dw_role_picks_mode_created_idx"
  ON "dw_role_picks" ("mode", "created_at" DESC);

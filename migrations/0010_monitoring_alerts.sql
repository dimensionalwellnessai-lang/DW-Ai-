-- Dedup table for operator alert emails. The scheduler health monitor runs
-- on every live instance, but only the one that wins this conditional UPSERT
-- actually sends the email — preventing N copies of the same alert when the
-- cluster has multiple instances.

CREATE TABLE IF NOT EXISTS "monitoring_alerts" (
  "alert_type" varchar PRIMARY KEY,
  "last_sent_at" timestamp NOT NULL DEFAULT now()
);

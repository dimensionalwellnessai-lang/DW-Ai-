-- Plug-and-play horizontal sharding for the reminder scheduler. Each running
-- instance claims one row (slot_index 0..N-1) on boot and heartbeats every
-- ~30s. Stale leases (>90s without heartbeat) are reclaimed automatically and
-- live instances compact down toward slot 0 so the slot space stays densely
-- packed [0..N-1] as servers come and go. Replaces SHARD_INDEX/SHARD_COUNT
-- env vars.

CREATE TABLE IF NOT EXISTS "scheduler_leases" (
  "slot_index" integer PRIMARY KEY,
  "instance_id" varchar NOT NULL UNIQUE,
  "last_heartbeat_at" timestamp NOT NULL DEFAULT now()
);

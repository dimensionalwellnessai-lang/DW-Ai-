/**
 * Dev-only convenience wrapper around the unified migration runner.
 *
 * Two responsibilities that DON'T belong on the prod startup path:
 *   1. Drop tables that used to be in `shared/schema.ts` but have since been
 *      removed. This keeps `drizzle-kit push` from prompting interactively
 *      about renames during post-merge — but it's destructive and must
 *      never run in production.
 *   2. Run the migration runner. The actual migration logic lives in
 *      `server/migrate.ts` and is also called directly from the prod
 *      startup path; this shim just composes it with the dev-only cleanup.
 *
 * Wired into:
 *   - scripts/dev-db-bootstrap.ts   (manual: `npx tsx scripts/dev-db-bootstrap.ts`)
 *   - scripts/post-merge.sh         (CI / post-merge)
 */

import pg from "pg";
import { runMigrations, type MigrationRunResult } from "./migrate";

const { Pool } = pg;

// Tables that used to exist but have since been removed from
// `shared/schema.ts`. Dropped only in dev so `drizzle-kit push` doesn't
// prompt about renames during post-merge.
const ORPHAN_TABLES = [
  "community_post_likes",
  "community_posts",
  "community_group_members",
  "community_groups",
  "saved_community_opportunities",
  "community_opportunities",
];

export async function bootstrapDevDb(): Promise<MigrationRunResult> {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "bootstrapDevDb() must not run in production — it drops legacy tables. Use runMigrations() instead.",
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    for (const table of ORPHAN_TABLES) {
      try {
        await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      } catch (err: any) {
        console.warn(
          `[dev-db-bootstrap] could not drop ${table}: ${err.message}`,
        );
      }
    }
  } finally {
    await pool.end();
  }

  return runMigrations();
}

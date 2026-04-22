/**
 * Dev DB bootstrap — replays every migration in `migrations/` against the
 * dev database, tolerating "already exists" / "already gone" errors so it
 * is safe to run against an existing database that has drifted from the
 * schema.
 *
 * Why this exists: the prod migration runner in `server/migrate.ts` uses
 * drizzle's official migrator, which tracks applied migrations in
 * `drizzle.__drizzle_migrations` and bails on the first conflict. The dev
 * DB has been hand-patched many times so its history doesn't line up with
 * the migration files, which means tables added by newer migrations
 * (e.g. `reminder_ledger`, `vapid_keys`, `budgets`, `mood_insights`)
 * never actually got created. This routine papers over that drift by
 * running the raw SQL with IF NOT EXISTS guards and ignoring the
 * specific PG error codes that mean "already in target state".
 *
 * Wired into:
 * - server/index.ts dev startup (so `npm run dev` self-heals)
 * - scripts/post-merge.sh (so task-agent merges land with a healthy DB)
 * - scripts/dev-db-bootstrap.ts (manual one-shot)
 */

import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

const SAFE_PG_CODES = new Set([
  "42P07", // duplicate_table
  "42701", // duplicate_column
  "42710", // duplicate_object (index, constraint, type, …)
  "42P16", // invalid_table_definition
  "42P06", // duplicate_schema
  "42723", // duplicate_function
  // Drift tolerance — the migration is trying to alter something that's
  // already in its target state. Real for the dev DB which has been
  // hand-patched many times.
  "42703", // undefined_column (e.g. ALTER TABLE … RENAME on a column already renamed)
  "42704", // undefined_object (DROP CONSTRAINT/INDEX that's already gone)
  "42P01", // undefined_table (DROP TABLE that's already gone)
]);

// Tables that used to exist but were removed from `shared/schema.ts`.
// Drop them so drizzle-kit push doesn't prompt about renames.
const ORPHAN_TABLES = [
  "community_post_likes",
  "community_posts",
  "community_group_members",
  "community_groups",
  "saved_community_opportunities",
  "community_opportunities",
];

export async function bootstrapDevDb(): Promise<{
  applied: number;
  skipped: number;
  files: number;
}> {
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
        // best-effort
        console.warn(
          `[dev-db-bootstrap] could not drop ${table}: ${err.message}`,
        );
      }
    }

    const migrationsDir = path.resolve(process.cwd(), "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.warn("[dev-db-bootstrap] no migrations/ directory; skipping");
      return { applied: 0, skipped: 0, files: 0 };
    }
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let applied = 0;
    let skipped = 0;

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      // drizzle-kit emits `--> statement-breakpoint` between statements.
      // Files without it are treated as a single statement.
      const statements = sql
        .split(/-->\s*statement-breakpoint/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        try {
          await pool.query(stmt);
          applied++;
        } catch (err: any) {
          const code = err?.code ?? "";
          if (SAFE_PG_CODES.has(code)) {
            skipped++;
          } else {
            console.error(
              `[dev-db-bootstrap] ${file} failed (code ${code}): ${err.message}`,
            );
            throw err;
          }
        }
      }
    }

    console.log(
      `[dev-db-bootstrap] applied ${applied} statement(s), skipped ${skipped} drift conflict(s) across ${files.length} migration file(s).`,
    );
    return { applied, skipped, files: files.length };
  } finally {
    await pool.end();
  }
}

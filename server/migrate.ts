/**
 * Idempotent migration runner.
 *
 * Why this exists: we previously used drizzle-orm's official `migrate()`
 * runner, which tracks applied migrations in `drizzle.__drizzle_migrations`
 * and bails on the first conflict. Two things broke that flow:
 *
 *   1. Most of this project's databases (dev + the original prod DB) were
 *      bootstrapped via `drizzle-kit push`, which never writes to
 *      `drizzle.__drizzle_migrations`. So drizzle's runner thought zero
 *      migrations had been applied and tried to replay every `.sql` file
 *      from scratch — every one of which then conflicted with the live
 *      schema.
 *
 *   2. `migrations/meta/_journal.json` was only updated for the first 12
 *      migrations. Files `0012_*.sql` … `0024_*.sql` existed on disk but
 *      drizzle's runner never even saw them, so any new feature relying on
 *      them (e.g. `mood_insights`, `dw_journal_entries.mood_log_id`)
 *      silently never landed. That's the bug Task #103 caught.
 *
 * The fix is a single runner that:
 *   - Scans `migrations/*.sql` from disk (no journal required).
 *   - Tracks applied files in `app_migrations` (file_name PK, hash, applied_at).
 *   - Runs each unapplied file's statements with drift tolerance — duplicate
 *     table/column/etc. errors are treated as success so an existing
 *     `db:push`-bootstrapped database self-heals: the first run stamps every
 *     pre-existing migration as applied, future runs only execute new files.
 *   - Records the file's hash so a re-edited migration is visible in logs
 *     (we still treat it as already-applied; deliberate breaking changes
 *     should ship as a new migration file).
 *
 * Wired into:
 *   - server/index.ts (dev + prod startup)
 *   - scripts/dev-db-bootstrap.ts + scripts/post-merge.sh (manual)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import pg from "pg";

const { Pool } = pg;

// PG error codes that mean "the thing this CREATE/ALTER is making is already
// in its target state". Always safe to treat as success.
const DUPLICATE_PG_CODES = new Set([
  "42P07", // duplicate_table
  "42701", // duplicate_column
  "42710", // duplicate_object (index, constraint, type, …)
  "42P16", // invalid_table_definition
  "42P06", // duplicate_schema
  "42723", // duplicate_function
]);

// PG error codes that mean "the thing this statement references doesn't exist
// (any more)". Only safe to ignore for explicit DROP / RENAME statements —
// for everything else they signal a real bug (e.g. selecting from a missing
// table) and we MUST surface them.
const MISSING_PG_CODES = new Set([
  "42703", // undefined_column
  "42704", // undefined_object (constraint/index/etc.)
  "42P01", // undefined_table
]);

function isDropOrRenameStatement(stmt: string): boolean {
  // Strip leading SQL comments / whitespace before sniffing the keyword so
  // the heuristic isn't fooled by a comment header.
  const head = stmt
    .replace(/--[^\n]*\n/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trimStart()
    .slice(0, 64)
    .toUpperCase();
  return (
    head.startsWith("DROP ") ||
    head.startsWith("ALTER TABLE") && /\bDROP\b|\bRENAME\b/i.test(stmt)
  );
}

export interface MigrationRunResult {
  files: number;
  newlyApplied: number;
  alreadyApplied: number;
  driftSkipped: number;
}

function hashSql(sql: string): string {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

function splitStatements(sql: string): string[] {
  // drizzle-kit emits `--> statement-breakpoint` between statements. Files
  // without it are run as a single statement.
  return sql
    .split(/-->\s*statement-breakpoint/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function runMigrations(): Promise<MigrationRunResult> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to run migrations");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });

  // Serialize runners across instances. Multi-instance deploys (or two dev
  // tabs racing on the same DB) can otherwise enter `runMigrations()` at the
  // same time and double-apply a file before its `app_migrations` row lands.
  // The advisory lock is held for the lifetime of this connection and
  // released on `pool.end()`. Lock id is an arbitrary stable 64-bit constant
  // namespaced to this app.
  const MIGRATION_ADVISORY_LOCK_ID = 0x4d_49_47_52_41_54_45n; // "MIGRATE"
  const lockClient = await pool.connect();

  try {
    await lockClient.query("SELECT pg_advisory_lock($1)", [
      MIGRATION_ADVISORY_LOCK_ID.toString(),
    ]);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "app_migrations" (
        "file_name" text PRIMARY KEY,
        "hash" text NOT NULL,
        "applied_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.resolve(process.cwd(), "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.warn("[migrate] no migrations/ directory; skipping");
      return { files: 0, newlyApplied: 0, alreadyApplied: 0, driftSkipped: 0 };
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const appliedRows = await pool.query<{ file_name: string; hash: string }>(
      `SELECT file_name, hash FROM "app_migrations"`,
    );
    const applied = new Map<string, string>(
      appliedRows.rows.map((r) => [r.file_name, r.hash]),
    );

    let newlyApplied = 0;
    let alreadyApplied = 0;
    let driftSkipped = 0;

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      const hash = hashSql(sql);

      const existingHash = applied.get(file);
      if (existingHash) {
        if (existingHash !== hash) {
          // The migration file changed after it was applied. We don't try to
          // re-run it (that's how you corrupt a prod schema). Surface a
          // warning so whoever did it ships a fresh migration instead.
          console.warn(
            `[migrate] ${file} hash changed since it was first applied — ignoring. Ship a new migration file for further changes.`,
          );
        }
        alreadyApplied++;
        continue;
      }

      const statements = splitStatements(sql);
      let fileDriftSkipped = 0;

      for (const stmt of statements) {
        try {
          await pool.query(stmt);
        } catch (err: any) {
          const code = err?.code ?? "";
          const isDuplicate = DUPLICATE_PG_CODES.has(code);
          const isMissingButOk =
            MISSING_PG_CODES.has(code) && isDropOrRenameStatement(stmt);
          if (isDuplicate || isMissingButOk) {
            fileDriftSkipped++;
            driftSkipped++;
          } else {
            console.error(
              `[migrate] ${file} failed (code ${code}): ${err.message}`,
            );
            throw err;
          }
        }
      }

      await pool.query(
        `INSERT INTO "app_migrations" ("file_name", "hash") VALUES ($1, $2)
         ON CONFLICT ("file_name") DO NOTHING`,
        [file, hash],
      );
      newlyApplied++;

      const driftSuffix =
        fileDriftSkipped > 0
          ? ` (skipped ${fileDriftSkipped} already-applied statement(s))`
          : "";
      console.log(`[migrate] applied ${file}${driftSuffix}`);
    }

    console.log(
      `[migrate] done — ${files.length} file(s): ${newlyApplied} newly applied, ${alreadyApplied} already applied, ${driftSkipped} drift-tolerant skip(s).`,
    );

    return {
      files: files.length,
      newlyApplied,
      alreadyApplied,
      driftSkipped,
    };
  } finally {
    try {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [
        MIGRATION_ADVISORY_LOCK_ID.toString(),
      ]);
    } catch {
      // The lock will release when the connection drops anyway.
    }
    lockClient.release();
    await pool.end();
  }
}

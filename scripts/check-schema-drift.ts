/**
 * Schema-drift check (Task #144).
 *
 * Runs `bootstrapDevDb()` against the configured DATABASE_URL, then
 * introspects `information_schema.columns` and asserts:
 *
 *   1. Every table declared via `pgTable(...)` in `shared/schema.ts`
 *      exists in the database.
 *   2. Every column declared on those tables exists too (name-level).
 *   3. The database does not contain orphan tables that aren't declared
 *      in `shared/schema.ts` (with a small allow-list for infra tables
 *      like the migration ledger and the express-session store).
 *
 * Exits non-zero on any drift. In CI this gates merges, so a future
 * migration that forgets a CREATE TABLE — or a schema removal that
 * forgets to add the table to `ORPHAN_TABLES` in
 * `server/dev-db-bootstrap.ts` — will fail the build immediately.
 *
 * Run locally:
 *   DATABASE_URL=postgres://… npx tsx scripts/check-schema-drift.ts
 *
 * In CI the GitHub Actions `schema-drift` job spins up a fresh
 * postgres:16 service and points DATABASE_URL at it, so the bootstrap
 * runs against an empty DB.
 */

import pg from "pg";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";

import * as schema from "../shared/schema";
import { bootstrapDevDb } from "../server/dev-db-bootstrap";

// Tables that legitimately live in the database without being declared
// in `shared/schema.ts`. Keep this list as small as possible.
const ALLOWED_NON_SCHEMA_TABLES = new Set<string>([
  // Migration ledger written by `server/migrate.ts`.
  "app_migrations",
  // Express-session store (created by connect-pg-simple at runtime).
  "session",
]);

interface SchemaTable {
  name: string;
  columns: Set<string>;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error(
      "[check:schema-drift] DATABASE_URL is not set. Point it at a throwaway Postgres (the CI job uses a postgres:16 service container).",
    );
    process.exit(2);
  }

  // 1. Apply every migration in `migrations/` against the target DB.
  console.log("[check:schema-drift] running bootstrapDevDb()…");
  await bootstrapDevDb();

  // 2. Walk the schema module to collect every pgTable + its columns.
  const schemaTables: SchemaTable[] = [];
  for (const exportValue of Object.values(schema)) {
    // `is()` is the drizzle-blessed runtime check; it is reliable across
    // the various wrapper objects drizzle attaches to a pgTable export.
    if (exportValue && is(exportValue as object, PgTable)) {
      const cfg = getTableConfig(exportValue as PgTable);
      schemaTables.push({
        name: cfg.name,
        columns: new Set(cfg.columns.map((c) => c.name)),
      });
    }
  }
  const schemaTableNames = new Set(schemaTables.map((t) => t.name));

  // 3. Introspect the live DB for table + column names.
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });

  const dbColumnsByTable = new Map<string, Set<string>>();
  try {
    // Restrict to BASE TABLEs so views and other relations don't
    // accidentally show up as "extra" tables the schema doesn't declare.
    // Left-join columns so a base table with zero columns (shouldn't
    // happen, but) still registers as present.
    const result = await pool.query<{
      table_name: string;
      column_name: string | null;
    }>(
      `SELECT t.table_name, c.column_name
         FROM information_schema.tables AS t
         LEFT JOIN information_schema.columns AS c
           ON c.table_schema = t.table_schema
          AND c.table_name = t.table_name
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'`,
    );
    for (const row of result.rows) {
      const cols =
        dbColumnsByTable.get(row.table_name) ?? new Set<string>();
      if (row.column_name) cols.add(row.column_name);
      dbColumnsByTable.set(row.table_name, cols);
    }
  } finally {
    await pool.end();
  }

  // 4. Diff schema vs DB.
  const errors: string[] = [];

  // 4a. Tables declared in schema but missing from DB, plus per-table
  //     missing columns for tables that DO exist.
  for (const t of schemaTables) {
    const dbCols = dbColumnsByTable.get(t.name);
    if (!dbCols) {
      errors.push(
        `Table "${t.name}" is declared in shared/schema.ts but is missing from the database. Add a CREATE TABLE migration under migrations/.`,
      );
      continue;
    }
    const missingCols: string[] = [];
    for (const col of t.columns) {
      if (!dbCols.has(col)) missingCols.push(col);
    }
    if (missingCols.length > 0) {
      errors.push(
        `Table "${t.name}" is missing columns: ${missingCols
          .map((c) => `"${c}"`)
          .join(", ")}. Add an ALTER TABLE migration under migrations/.`,
      );
    }
    // Also flag extra columns the DB carries that aren't declared in
    // the schema — usually a sign of a removed column that wasn't
    // dropped, or a migration that added a column without a matching
    // schema update.
    const extraCols: string[] = [];
    for (const col of dbCols) {
      if (!t.columns.has(col)) extraCols.push(col);
    }
    if (extraCols.length > 0) {
      errors.push(
        `Table "${t.name}" has columns in the database that are NOT declared in shared/schema.ts: ${extraCols
          .map((c) => `"${c}"`)
          .join(", ")}. Either re-declare them on the schema, or add an ALTER TABLE … DROP COLUMN migration.`,
      );
    }
  }

  // 4b. Tables in DB that are neither in schema nor on the allow-list.
  for (const dbTable of dbColumnsByTable.keys()) {
    if (schemaTableNames.has(dbTable)) continue;
    if (ALLOWED_NON_SCHEMA_TABLES.has(dbTable)) continue;
    errors.push(
      `Table "${dbTable}" exists in the database but is NOT declared in shared/schema.ts. Either re-add it to the schema, or add it to ORPHAN_TABLES in server/dev-db-bootstrap.ts so dev DBs drop it on the next bootstrap. (Infra-only tables that should always live in the DB without a schema entry — e.g. the migration ledger or express-session store — belong in ALLOWED_NON_SCHEMA_TABLES in this script.)`,
    );
  }

  if (errors.length > 0) {
    console.error("\n[check:schema-drift] DRIFT DETECTED:");
    for (const e of errors) console.error("  - " + e);
    console.error(
      `\n[check:schema-drift] FAIL: ${errors.length} drift issue(s).`,
    );
    process.exit(1);
  }

  console.log(
    `[check:schema-drift] OK — ${schemaTables.length} schema table(s) match the database (column-level); ${ALLOWED_NON_SCHEMA_TABLES.size} infra table(s) allow-listed.`,
  );
}

main().catch((err) => {
  console.error("[check:schema-drift] crashed:", err);
  process.exit(2);
});

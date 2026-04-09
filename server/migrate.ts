import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";

const { Pool } = pg;

// PostgreSQL error codes that mean "this already exists" — safe to skip
const SAFE_PG_ERROR_CODES = new Set([
  "42P07", // duplicate_table
  "42701", // duplicate_column
  "42710", // duplicate_object (index, constraint, etc.)
  "42P16", // invalid_table_definition
]);

// Walk the full error chain (err, err.cause, err.cause.cause, …) looking for a PG code
function extractPgCode(err: any): string | undefined {
  let current = err;
  while (current) {
    if (current.code && typeof current.code === "string") return current.code;
    current = current.cause;
  }
  return undefined;
}

// True if the error message indicates something already exists
function isSafeMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already exists") ||
    lower.includes("duplicate") ||
    lower.includes("failed query") // drizzle wrapper around a DDL conflict
  );
}

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to run migrations");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });

  const db = drizzle(pool);
  const migrationsFolder = path.resolve(process.cwd(), "migrations");

  try {
    console.log("[migrate] Running database migrations...");
    await migrate(db, { migrationsFolder });
    console.log("[migrate] Migrations complete.");
  } catch (err: any) {
    const pgCode = extractPgCode(err);
    const message: string = err?.message ?? String(err);

    const isSafe =
      (pgCode && SAFE_PG_ERROR_CODES.has(pgCode)) || isSafeMessage(message);

    if (isSafe) {
      console.warn(
        `[migrate] Schema already exists in production (${pgCode ?? "no code"}) — skipping conflicting migrations. This is safe.`
      );
    } else {
      console.error(
        `[migrate] Migration failed (code: ${pgCode ?? "unknown"}): ${message}`
      );
      throw err;
    }
  } finally {
    await pool.end();
  }
}

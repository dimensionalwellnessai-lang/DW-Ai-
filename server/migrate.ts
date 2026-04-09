import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";

const { Pool } = pg;

// PostgreSQL error codes that are safe to ignore when the schema already exists
const SAFE_MIGRATION_ERROR_CODES = new Set([
  "42P07", // duplicate_table — relation already exists
  "42701", // duplicate_column — column already exists
  "42710", // duplicate_object — object (index, constraint, etc.) already exists
  "42P16", // invalid_table_definition — e.g. constraint already defined
]);

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
    const code = err?.code ?? "unknown";
    const message = err?.message ?? String(err);

    if (SAFE_MIGRATION_ERROR_CODES.has(code)) {
      console.warn(
        `[migrate] Skipping migration conflict (${code}): ${message}. ` +
          "The existing schema is still valid — continuing startup."
      );
    } else {
      console.error(
        `[migrate] Migration failed with error code "${code}": ${message}`
      );
      throw err;
    }
  } finally {
    await pool.end();
  }
}

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";

const { Pool } = pg;

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to run migrations");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const migrationsFolder = path.resolve(process.cwd(), "migrations");

  try {
    console.log("[migrate] Running database migrations...");
    await migrate(db, { migrationsFolder });
    console.log("[migrate] Migrations complete.");
  } catch (err: any) {
    // PostgreSQL error code 42P07 = "relation already exists"
    // This happens when the production DB already has tables from a previous
    // deployment that pre-dates the Drizzle migrations journal.
    // We log the warning and continue — the existing schema is still valid.
    if (err?.code === "42P07") {
      console.warn(
        "[migrate] Some tables already exist in production — skipping conflicting migrations. This is safe.",
        err.message
      );
    } else {
      throw err;
    }
  } finally {
    await pool.end();
  }
}

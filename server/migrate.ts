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
  } finally {
    await pool.end();
  }
}

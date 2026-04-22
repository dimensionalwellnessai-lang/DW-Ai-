/**
 * One-shot CLI wrapper around `bootstrapDevDb` so devs (or post-merge.sh)
 * can run it manually:
 *
 *   npx tsx scripts/dev-db-bootstrap.ts
 *
 * The actual implementation lives in `server/dev-db-bootstrap.ts` because
 * the dev server boots it automatically on startup too.
 */

import { bootstrapDevDb } from "../server/dev-db-bootstrap";

bootstrapDevDb()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[dev-db-bootstrap] failed:", err);
    process.exit(1);
  });

/**
 * One-shot maintenance script to backfill the Life System (pillars + projects)
 * for every existing user, instead of waiting for them to lazily open
 * /life-system. Safe to run multiple times — backfillLifeSystemForUser is
 * idempotent (it returns null when the user already has any pillars).
 *
 * Usage:
 *   npx tsx scripts/backfill-life-system.ts
 */

import { storage } from "../server/storage";
import { backfillLifeSystemForUser } from "../server/routes/life-system-pillars";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const startedAt = Date.now();
  const userIds = await storage.listAllUserIds();
  console.log(
    `[backfill-life-system] Found ${userIds.length} total users.` +
    (dryRun ? " (dry-run: no writes will occur)" : ""),
  );

  let eligible = 0;
  let seeded = 0;
  let alreadySeeded = 0;
  let noOnboarding = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      const [profile, existingPillars] = await Promise.all([
        storage.getOnboardingProfile(userId),
        storage.getLifeSystemPillars(userId),
      ]);

      if (!profile) {
        noOnboarding++;
        continue;
      }
      if (existingPillars.length > 0) {
        alreadySeeded++;
        continue;
      }

      eligible++;
      if (dryRun) {
        console.log(`[backfill-life-system] (dry-run) would seed ${userId}`);
        continue;
      }

      const summary = await backfillLifeSystemForUser(userId);
      if (summary) {
        seeded++;
        const carried = summary.carried?.length ? ` (${summary.carried.join("; ")})` : "";
        console.log(`[backfill-life-system] ✓ Seeded ${userId}${carried}`);
      } else {
        // Helper short-circuited despite our pre-check (race or in-flight seed).
        alreadySeeded++;
      }
    } catch (err) {
      failed++;
      console.error(`[backfill-life-system] ✗ Failed ${userId}:`, err);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[backfill-life-system] Done in ${elapsed}s. ` +
    `Scanned: ${userIds.length}, eligible: ${eligible}, seeded: ${seeded}, ` +
    `already-had-pillars: ${alreadySeeded}, no-onboarding-profile: ${noOnboarding}, failed: ${failed}.` +
    (dryRun ? " (dry-run — no rows written)" : ""),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill-life-system] Fatal error:", err);
    process.exit(1);
  });

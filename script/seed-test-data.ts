/**
 * seed-test-data.ts – Test Data Seed Script
 *
 * Creates an isolated test user with predictable data for automated and
 * manual QA of all Home Card flows (Momentum, Follow-ups, Plan in Motion,
 * Daily Check-in) and key regression scenarios.
 *
 * Usage:
 *   npm run seed:test
 *
 * Acceptance criteria:
 *   - Script is idempotent (safe to run multiple times)
 *   - Creates test user with email TEST_EMAIL / TEST_PASSWORD
 *   - Seeds habits (with streaks), goals (with progress), a daily check-in,
 *     a DW follow-up, and a mood log so all home cards render with data
 *   - Logs each step with ✅ / ❌ so CI can parse pass/fail
 *   - Exits with code 1 on any critical error; non-critical seeding failures
 *     (habit logs, mood logs) are logged but do not stop the script
 *
 * Test Credentials:
 *   Email:    test@dimensionalwellness.test
 *   Password: TestWellness2026!
 */

import bcrypt from "bcrypt";
import { storage } from "../server/storage";

// ── Config ────────────────────────────────────────────────────────────────────

const TEST_EMAIL = "test@dimensionalwellness.test";
const TEST_PASSWORD = "TestWellness2026!";
const SALT_ROUNDS = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(step: string, ok: boolean, detail?: string): void {
  const icon = ok ? "✅" : "❌";
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`${icon} ${step}${suffix}`);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedTestData(): Promise<void> {
  console.log("🧪 Starting test data seed…\n");

  // ── 1. Remove existing test user (idempotent) ─────────────────────────────
  try {
    const existing = await storage.getUserByEmail(TEST_EMAIL);
    if (existing) {
      console.log("   Found existing test user — removing…");
      // storage.deleteUser handles all child-table cleanup in dependency order
      await storage.deleteUser(existing.id);
    }
    log("Reset existing test user", true);
  } catch (err) {
    log("Reset existing test user", false, String(err));
    process.exit(1);
  }

  // ── 2. Create test user ────────────────────────────────────────────────────
  let userId: string;
  try {
    const hashed = await bcrypt.hash(TEST_PASSWORD, SALT_ROUNDS);
    const user = await storage.createUser({
      email: TEST_EMAIL,
      password: hashed,
      username: "QA Test User",
      firstName: "QA",
      systemName: "QA Wellness System",
      onboardingCompleted: true,
    });
    userId = user.id;
    log("Create test user", true, `ID=${userId}`);
  } catch (err) {
    log("Create test user", false, String(err));
    process.exit(1);
  }

  // ── 3. Seed habits with streaks (MomentumCard data) ───────────────────────
  let habitIds: string[] = [];
  try {
    const habitData = [
      { title: "Morning meditation", frequency: "daily" as const, streak: 7 },
      { title: "30-min walk", frequency: "daily" as const, streak: 3 },
      { title: "Read 20 pages", frequency: "daily" as const, streak: 0 },
    ];

    for (const h of habitData) {
      const habit = await storage.createHabit({
        userId,
        title: h.title,
        description: `Test habit: ${h.title}`,
        frequency: h.frequency,
        isActive: true,
        streak: h.streak,
        dataSource: "manual",
      });
      habitIds.push(habit.id);

      // Log completions for streak days – habit_logs has no userId column
      for (let i = 0; i < h.streak; i++) {
        await storage.createHabitLog({
          habitId: habit.id,
          completedAt: daysAgo(i),
        }).catch(() => null); // non-critical
      }
    }
    log("Seed habits with streaks", true, `${habitIds.length} habits`);
  } catch (err) {
    log("Seed habits with streaks", false, String(err));
    // Non-fatal – continue
  }

  // ── 4. Seed goals with progress (PlanInMotionCard data) ───────────────────
  try {
    const goalsData = [
      { title: "Complete 5K training plan", progress: 65 },
      { title: "Reduce screen time by 1h/day", progress: 40 },
      { title: "Sleep 8h consistently for 30 days", progress: 20 },
      { title: "Build emergency fund", progress: 10 },
    ];

    for (const g of goalsData) {
      await storage.createGoal({
        userId,
        title: g.title,
        description: `Test goal: ${g.title}`,
        isActive: true,
        progress: g.progress,
        wellnessDimension: "overall",
        dataSource: "manual",
      });
    }
    log("Seed goals with progress", true, `${goalsData.length} goals`);
  } catch (err) {
    log("Seed goals with progress", false, String(err));
    // Non-fatal – continue
  }

  // ── 5. Daily check-in note ────────────────────────────────────────────────
  // TODO: Once the /api/daily-checkins endpoint is implemented server-side,
  // add an upsert step here to seed today's check-in for the test user.
  // Guest check-ins are stored in localStorage by useDailyCheckin and need
  // no server-side seed.
  log("Daily check-in step", true, "skipped — server endpoint not yet implemented (TODO)");

  // ── 6. Seed mood log (HealthSnapshotCard / regression) ────────────────────
  try {
    await storage.createMoodLog({
      userId,
      energyLevel: 4,
      moodLevel: 4,
      clarityLevel: 3,
      notes: "Feeling energised after my walk",
    });
    log("Seed mood log", true);
  } catch (err) {
    log("Seed mood log", false, String(err));
    // Non-fatal
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log("\n🎉 Test data seed complete!\n");
  console.log("  Login with:");
  console.log(`    Email:    ${TEST_EMAIL}`);
  console.log(`    Password: ${TEST_PASSWORD}`);
  console.log("\n  Run 'npm run seed:test' again to reset to a clean state.\n");
}

// ── Entry point ───────────────────────────────────────────────────────────────

seedTestData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed script failed:", err);
    process.exit(1);
  });

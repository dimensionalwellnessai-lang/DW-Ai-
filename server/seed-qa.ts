/**
 * QA Seed Script – Minimal Test Data for Home Command Center Cards
 *
 * Creates a focused QA account with the exact data needed to exercise each
 * Home card scenario: Momentum, Follow-ups, Plan in Motion, and Daily Check-in.
 *
 * QA Account Credentials:
 *   Email:    qa@dimensionalwellness.app
 *   Password: QaWellness2026!
 *
 * Usage:
 *   npm run seed:qa
 *
 * Scenarios covered:
 *   - MomentumCard:     2 habits (one with a 7-day streak, one with a 3-day streak)
 *   - PlanInMotionCard: 2 active goals with progress values
 *   - FollowUpCard:     trigger a DW conversation via the app UI to generate a follow-up (not seeded by this script)
 *   - DailyCheckinCard: submit today's check-in via the app UI after login (not seeded by this script)
 */

import bcrypt from "bcrypt";
import { storage } from "./storage";

const QA_EMAIL = "qa@dimensionalwellness.app";
const QA_PASSWORD = "QaWellness2026!";
const SALT_ROUNDS = 10;

// ── Main seed function ─────────────────────────────────────────────────────────

async function seedQaAccount() {
  console.log("🧪 Starting QA account seed…\n");

  try {
    // ── 1. Idempotent teardown ────────────────────────────────────────────────
    console.log("1️⃣  Removing existing QA account (if present)…");
    const existing = await storage.getUserByEmail(QA_EMAIL);
    if (existing) {
      await storage.deleteUser(existing.id);
      console.log("   ✅ Existing QA account removed\n");
    } else {
      console.log("   No existing QA account found\n");
    }

    // ── 2. Create QA user ─────────────────────────────────────────────────────
    console.log("2️⃣  Creating QA user…");
    const hashedPassword = await bcrypt.hash(QA_PASSWORD, SALT_ROUNDS);
    const user = await storage.createUser({
      email: QA_EMAIL,
      password: hashedPassword,
      username: "QA Tester",
      firstName: "QA",
      systemName: "QA Wellness System",
      onboardingCompleted: true,
    });
    console.log(`   ✅ QA user created (ID: ${user.id})\n`);

    // ── 3. Create goals (PlanInMotionCard) ────────────────────────────────────
    console.log("3️⃣  Creating goals for PlanInMotionCard…");
    const goalData = [
      {
        userId: user.id,
        title: "Complete Vitest test suite",
        description: "Write and pass all QA smoke tests",
        dimension: "intellectual",
        status: "in_progress",
        priority: "high",
        progress: 65,
      },
      {
        userId: user.id,
        title: "Run 3x per week",
        description: "Build a consistent cardio habit",
        dimension: "physical",
        status: "in_progress",
        priority: "medium",
        progress: 30,
      },
    ];
    for (const goal of goalData) {
      await storage.createGoal(goal);
    }
    console.log(`   ✅ Created ${goalData.length} goals\n`);

    // ── 4. Create habits + logs (MomentumCard) ────────────────────────────────
    console.log("4️⃣  Creating habits with streak data for MomentumCard…");
    const habit7 = await storage.createHabit({
      userId: user.id,
      title: "Morning meditation",
      description: "10 min guided session",
      frequency: "daily",
      streak: 7,
    });
    const habit3 = await storage.createHabit({
      userId: user.id,
      title: "Evening journaling",
      description: "5 min reflection",
      frequency: "daily",
      streak: 3,
    });

    // Seed habit logs to substantiate the streaks
    for (let i = 0; i < 7; i++) {
      await storage.createHabitLog({
        habitId: habit7.id,
      });
    }
    for (let i = 0; i < 3; i++) {
      await storage.createHabitLog({
        habitId: habit3.id,
      });
    }
    console.log("   ✅ Created 2 habits with streak logs\n");

    // ── 5. Notes on manual steps ──────────────────────────────────────────────
    console.log("5️⃣  Manual QA steps:");
    console.log("   • DailyCheckinCard: log in and submit today's check-in via the UI");
    console.log("   • FollowUpCard:     trigger a DW conversation to generate a follow-up\n");

    // ── Done ──────────────────────────────────────────────────────────────────
    console.log("✅ QA seed complete!\n");
    console.log("══════════════════════════════════════════");
    console.log("QA Account Credentials:");
    console.log("══════════════════════════════════════════");
    console.log(`  Email:    ${QA_EMAIL}`);
    console.log("══════════════════════════════════════════\n");
    console.log("Scenarios covered:");
    console.log("  ✓ MomentumCard     – 2 habits (7-day + 3-day streak)");
    console.log("  ✓ PlanInMotionCard – 2 active goals with progress");
    console.log("  ✗ DailyCheckinCard – submit manually via UI after login");
    console.log("  ✗ FollowUpCard     – trigger via DW conversation after login\n");

  } catch (error) {
    console.error("❌ QA seed failed:", error);
    process.exit(1);
  }
}

// ── Run ────────────────────────────────────────────────────────────────────────

const isMainModule =
  import.meta.url.endsWith(process.argv[1]) ||
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1].endsWith("seed-qa.ts");

if (isMainModule) {
  seedQaAccount()
    .then(() => {
      console.log("🎉 QA seed completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 QA seed failed:", error);
      process.exit(1);
    });
}

export { seedQaAccount, QA_EMAIL, QA_PASSWORD };

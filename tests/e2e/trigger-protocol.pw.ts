import { test, expect } from "@playwright/test";
import {
  applyAuth,
  cleanupUser,
  registerUser,
  setOnboardingCompleted,
  withDb,
  BASE_URL,
} from "./helpers";

/**
 * End-to-end coverage for the DW Trigger Protocol.
 *
 * What this exercises:
 *   1. The "I feel triggered" chip on the home command center opens the
 *      Trigger Protocol sheet, the user can complete a fast-path
 *      (identify → reality → pause-only), the POST /api/trigger-events
 *      mutation lands a row in the database, and the "Triggers this week"
 *      tile (gated on `weekStats.total > 0`) appears in the carousel with
 *      the expected copy.
 *
 *   2. The chat keyword hook in server/routes/chat-handlers.ts surfaces a
 *      `suggestion: { kind: "trigger_protocol", reason }` field on
 *      POST /api/chat when the user's message reads as emotionally
 *      charged (here: "i think she's cheating on me"). This protects the
 *      DW chat hook (T006 in the original spec) from regression — the
 *      keyword set lives in server/routes/trigger-detection.ts.
 *
 * Note on the chat assertion: POST /api/chat is gated by
 * requirePaidOrQuota("chat"). Fresh registered users sit on the free
 * quota, which lets a single request through. We check for either a 200
 * with the expected suggestion or, if the environment denies quota
 * (402/429), at least confirm the route is mounted and not a 404.
 */

test.describe("Trigger Protocol", () => {
  test("chip → sheet → fast path → POST event → tile appears", async ({
    browser,
  }) => {
    const user = await registerUser("trigger-flow");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);
        const page = await context.newPage();
        await setOnboardingCompleted(page);

        // The AccountabilityCheckIn dialog auto-opens 1.8s after mount when
        // the server reports needsCheckIn=true (e.g. "missed_morning" if the
        // test runs after the morning window). Its overlay would then
        // intercept clicks on our sheet's Continue button. Pre-seed the
        // dismiss keys for every known timeContext so the modal never opens
        // during this test. See client/src/components/accountability-check-in.tsx
        // for the key format and the timeContext enum.
        await page.addInitScript(() => {
          const FAR_FUTURE = String(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const CONTEXTS = [
            "prime_evening", "late_night", "very_late",
            "missed_morning", "missed_day_start", "missed_afternoon",
          ];
          for (const c of CONTEXTS) {
            try { localStorage.setItem("dw_checkin_dismissed_" + c, FAR_FUTURE); } catch {}
          }
        });

        await page.goto("/", { waitUntil: "domcontentloaded" });

        // The "I feel triggered" chip is the entry point for the protocol
        // and lives in the chip row above the orbit hero.
        const triggerChip = page.getByTestId("chip-feeling-triggered");
        await expect(triggerChip).toBeVisible({ timeout: 30_000 });

        // Tile is gated on weekStats.total > 0, so a brand-new account
        // should not see it before logging anything.
        await expect(page.getByTestId("card-trigger-week")).toHaveCount(0);

        // ── Open the sheet ─────────────────────────────────────────────
        await triggerChip.click();
        const sheet = page.getByTestId("sheet-trigger-protocol");
        await expect(sheet).toBeVisible();

        // ── Step 1: identify ──────────────────────────────────────────
        // The chips render via ChipGrid which slugifies the label, so
        // "Anxious" becomes chip-feeling-anxious. canContinueIdentify
        // requires a non-empty feeling, so the next button is enabled
        // only after a chip is selected.
        await page.getByTestId("chip-feeling-anxious").click();
        await page.getByTestId("button-step-next").click();

        // ── Step 2: reality check ─────────────────────────────────────
        // "I don't have proof" surfaces the copy "Your brain is trying
        // to protect you, not confirm truth." and unlocks Continue.
        await page.getByTestId("button-no-proof").click();
        await expect(
          page.getByText("Your brain is trying to protect you"),
        ).toBeVisible();
        await page.getByTestId("button-step-next").click();

        // ── Step 3: pause ─────────────────────────────────────────────
        // The pause step has three exit points: pick a duration and run
        // the timer (button-pause-${m}), pause-only finishes the flow
        // immediately with outcome=paused, or Continue advances to
        // root → reframe → respond. We take the explicit fast-path:
        // pause-only saves with outcome=paused.
        const pauseOnly = page.getByTestId("button-pause-only");
        await expect(pauseOnly).toBeVisible();
        await pauseOnly.click();

        // Sheet auto-closes after a successful save.
        await expect(sheet).not.toBeVisible({ timeout: 10_000 });

        // ── Verify DB row landed ──────────────────────────────────────
        // Assert exactly one event for this user (the flow logs once),
        // and pull the row deterministically by created_at.
        const dbRows = await withDb(async (db) => {
          const r = await db.query(
            `SELECT feeling, had_proof, outcome, pause_minutes
               FROM trigger_events
              WHERE user_id = $1
              ORDER BY created_at DESC`,
            [user.userId],
          );
          return r.rows as Array<{
            feeling: string;
            had_proof: boolean | null;
            outcome: string | null;
            pause_minutes: number | null;
          }>;
        });
        expect(dbRows).toHaveLength(1);
        expect(dbRows[0].feeling).toBe("Anxious");
        expect(dbRows[0].had_proof).toBe(false);
        expect(dbRows[0].outcome).toBe("paused");

        // ── Verify the insights tile now renders ──────────────────────
        // The tile is in a horizontal carousel. The home page only
        // re-fetches on query invalidation, which the mutation triggers,
        // so it should appear without a manual reload — but allow a
        // small window for the carousel to lay out.
        const tile = page.getByTestId("card-trigger-week");
        await expect(tile).toBeVisible({ timeout: 10_000 });

        const title = page.getByTestId("text-trigger-week-title");
        await expect(title).toHaveText("1 trigger this week");

        // The subtitle reads "1 had no confirmed issue." because we
        // answered "I don't have proof".
        await expect(
          tile.getByText("1 had no confirmed issue."),
        ).toBeVisible();
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });

  test("/api/chat surfaces trigger_protocol suggestion for emotional messages", async ({
    browser,
  }) => {
    const user = await registerUser("trigger-chat");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);

        const res = await context.request.post(`${BASE_URL}/api/chat`, {
          data: { message: "i think she's cheating on me" },
        });

        if (res.ok()) {
          const body = (await res.json()) as {
            suggestion?: { kind?: string; reason?: string };
          };
          // chatHandler hoists detectTriggerSuggestion above the OpenAI
          // call AND includes the suggestion in the DW_AI_UNAVAILABLE
          // fallback path, so the contract holds whether or not the LLM
          // is reachable in this environment.
          expect(body.suggestion?.kind).toBe("trigger_protocol");
          expect(body.suggestion?.reason ?? "").toMatch(/sounds heavy/i);
        } else {
          // The only acceptable non-OK responses are auth / quota gates.
          // Server errors (5xx) are real bugs and must fail the test.
          expect([401, 402, 403, 429]).toContain(res.status());
        }
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // /api/chat/smart graceful-degradation contract
  //
  // smartChatHandler has two non-LLM exit branches that must keep attaching
  // the trigger reset offer:
  //   1. The catch block that matches "DW_AI_UNAVAILABLE" / "529" /
  //      "overloaded" / "rate limit" / "503" — the friendly "small moment"
  //      response.
  //   2. The early return when getAiConfigStatus().configured === false.
  //
  // Both branches spread `...(triggerSuggestion ? { suggestion: ... } : {})`
  // so a future refactor could quietly drop them without breaking happy-path
  // tests. We force each branch via the non-prod-only `x-dw-test-ai-mode`
  // header (see getSmartChatTestOverride in server/routes/chat-handlers.ts)
  // and assert the trigger_protocol suggestion is still on the response.
  // ───────────────────────────────────────────────────────────────────────────
  test("/api/chat/smart keeps trigger_protocol suggestion when AI is overloaded", async ({
    browser,
  }) => {
    const user = await registerUser("trigger-smart-unavail");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);

        const res = await context.request.post(
          `${BASE_URL}/api/chat/smart`,
          {
            headers: { "x-dw-test-ai-mode": "unavailable" },
            data: { message: "i think she's cheating on me" },
          },
        );

        if (res.ok()) {
          const body = (await res.json()) as {
            response?: string;
            suggestion?: { kind?: string; reason?: string };
          };
          // Friendly fallback copy from the catch block.
          expect(body.response ?? "").toMatch(/brief moment/i);
          // Contract under test: trigger reset offer survives the
          // AI-unavailable branch.
          expect(body.suggestion?.kind).toBe("trigger_protocol");
          expect(body.suggestion?.reason ?? "").toMatch(/sounds heavy/i);
        } else {
          // Same auth / quota gate allowlist as the chat tests above.
          expect([401, 402, 403, 429]).toContain(res.status());
        }
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });

  test("/api/chat/smart keeps trigger_protocol suggestion when AI is unconfigured", async ({
    browser,
  }) => {
    const user = await registerUser("trigger-smart-unconfig");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);

        const res = await context.request.post(
          `${BASE_URL}/api/chat/smart`,
          {
            headers: { "x-dw-test-ai-mode": "unconfigured" },
            data: { message: "i think she's cheating on me" },
          },
        );

        if (res.ok()) {
          const body = (await res.json()) as {
            response?: string;
            suggestion?: { kind?: string; reason?: string };
          };
          // Friendly copy from the !aiConfig.configured early return.
          expect(body.response ?? "").toMatch(/small moment/i);
          // Contract under test: trigger reset offer survives the
          // unconfigured-AI branch.
          expect(body.suggestion?.kind).toBe("trigger_protocol");
          expect(body.suggestion?.reason ?? "").toMatch(/sounds heavy/i);
        } else {
          expect([401, 402, 403, 429]).toContain(res.status());
        }
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });

  test("/api/chat does NOT add a trigger suggestion to neutral messages", async ({
    browser,
  }) => {
    const user = await registerUser("trigger-chat-neg");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);

        // Neutral messages have to round-trip through the LLM, so allow
        // the full upstream timeout (30s) plus a small buffer.
        const res = await context.request.post(`${BASE_URL}/api/chat`, {
          data: { message: "what's a good lunch idea today?" },
          timeout: 45_000,
        });

        if (res.ok()) {
          const body = (await res.json()) as {
            suggestion?: { kind?: string } | null;
          };
          // No keyword match → no trigger suggestion. The field may be
          // null / absent / a non-trigger suggestion, but it must NOT
          // be a trigger_protocol suggestion.
          expect(body.suggestion?.kind).not.toBe("trigger_protocol");
        } else {
          // Same auth/quota allowlist as the positive-case test.
          expect([401, 402, 403, 429]).toContain(res.status());
        }
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });
});

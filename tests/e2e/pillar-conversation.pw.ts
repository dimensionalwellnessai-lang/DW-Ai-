import { test, expect, type Page } from "@playwright/test";
import {
  applyAuth,
  cleanupUser,
  registerUser,
  setOnboardingCompleted,
  withDb,
} from "./helpers";

/**
 * End-to-end coverage for the DW conversation panel on
 * /life-system/pillar/:id.
 *
 * What this exercises:
 *   1. Sending a message through the chat input round-trips through
 *      POST /api/life-system/pillars/:pillarId/converse:
 *        - the user message renders in the transcript,
 *        - DW's reply renders in the transcript,
 *        - the server persists both messages onto the pillar's
 *          content.conversation,
 *        - the structured-field extraction populates at least one of
 *          { description, userVoice, weeklyRhythm, laws, nonNegotiables }
 *          on the same row (the "fills out the Life System BY TALKING TO
 *          DW" promise).
 *
 *   2. The "Clear conversation" action (in the conversation card's
 *      overflow menu) clears the rendered transcript AND removes
 *      content.conversation from the DB row so a regression in the
 *      clear path can't slip through.
 *
 * Why physical_environment: same reason as pillar-inline-editors.pw.ts —
 * it's a Core pillar that the Life System backfill always seeds with
 * non-empty starter content for new users, so the page renders straight
 * away.
 *
 * On flakiness: the converse route calls gpt-4o-mini and the structured
 * update depends on the model recognising fields in our message. To keep
 * this stable we craft the user message with a near-verbatim "describe
 * it as: …" / "in my own words: …" framing and assert only that *some*
 * structured field changed on the row — not which one. If the LLM is
 * unreachable in this environment (POST returns 5xx) the test is
 * skipped rather than failed, mirroring the pattern in
 * trigger-protocol.pw.ts.
 */

const PILLAR_ID = "physical_environment";

interface ConversePillarRow {
  content: Record<string, unknown> | null;
}

async function readPillarContent(
  userId: string,
): Promise<Record<string, unknown> | null> {
  return withDb(async (db) => {
    const r = await db.query<ConversePillarRow>(
      `SELECT content FROM life_system_pillars
        WHERE user_id = $1 AND pillar_id = $2`,
      [userId, PILLAR_ID],
    );
    return r.rows[0]?.content ?? null;
  });
}

/**
 * Send one message through the chat input and wait for the converse
 * round-trip to settle (request + DOM update). Returns the server's
 * JSON response so the caller can assert on capturedFields directly,
 * or `null` ONLY when the server returned a 5xx (treated as a
 * transient upstream failure, e.g. the LLM is unreachable in this
 * environment). Any 4xx is a real regression in the route contract
 * and is asserted against here so it can't slip through as a skip.
 */
async function sendMessage(
  page: Page,
  message: string,
): Promise<{
  reply: { content: string };
  conversation: Array<{ role: string; content: string }>;
  capturedFields?: string[];
} | null> {
  const input = page.getByTestId("input-converse-message");
  const send = page.getByTestId("button-send-converse");
  await expect(input).toBeEnabled();

  // Wait for the POST response so we can read capturedFields without
  // racing the React state mirror.
  const responsePromise = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/api\/life-system\/pillars\/[^/]+\/converse$/.test(
        new URL(r.url()).pathname,
      ),
    { timeout: 45_000 },
  );

  await input.fill(message);
  await expect(send).toBeEnabled();
  await send.click();

  const response = await responsePromise;
  const status = response.status();
  if (status >= 500) {
    // Treat as transient — caller decides to skip vs. continue.
    return null;
  }
  // 4xx (e.g. 400/401/403/422) means the route contract is broken.
  // Assert OK explicitly so the test fails with a clear message
  // instead of getting silently skipped further down.
  const text = response.ok() ? "" : await response.text();
  expect(
    response.ok(),
    `converse POST returned ${status}: ${text.slice(0, 500)}`,
  ).toBe(true);

  const body = (await response.json()) as {
    reply: { content: string };
    conversation: Array<{ role: string; content: string }>;
    capturedFields?: string[];
  };

  // Wait for the "DW is listening…" indicator to go away so the
  // assistant bubble has rendered before the caller asserts on it.
  await expect(page.getByTestId("indicator-sending")).toHaveCount(0, {
    timeout: 10_000,
  });

  return body;
}

test.describe("Pillar DW conversation panel", () => {
  test("sends a message, renders the transcript, and persists structured capture", async ({
    browser,
  }) => {
    const user = await registerUser("pillar-converse");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);
        const page = await context.newPage();
        await setOnboardingCompleted(page);

        await page.goto(`/life-system/pillar/${PILLAR_ID}`, {
          waitUntil: "domcontentloaded",
        });

        // Wait for the chat card to mount (the page shows a spinner
        // while the Life System query resolves).
        const chatInput = page.getByTestId("input-converse-message");
        await expect(chatInput).toBeVisible({ timeout: 30_000 });

        // Read the pre-conversation row so we can prove the converse
        // round-trip wrote something new (vs. just echoing what the
        // backfill seeded).
        const before = await readPillarContent(user.userId);
        expect(before).not.toBeNull();
        const beforeConversation = Array.isArray(
          (before as Record<string, unknown>).conversation,
        )
          ? ((before as Record<string, unknown>).conversation as unknown[])
          : [];

        // Craft a message designed to cleanly map to the description
        // and userVoice fields. The system prompt instructs DW to fill
        // these once the user has clearly expressed them; the explicit
        // "describe it as:" / "in my own words:" framing makes that
        // unambiguous.
        const stamp = Date.now().toString(36);
        const userText =
          `Here is how I would describe my physical environment: ` +
          `it is a bright, minimal apartment full of plants and natural light (tag ${stamp}). ` +
          `In my own words: "My space is my sanctuary — calm, clean, and full of natural light."`;

        const result = await sendMessage(page, userText);
        if (!result) {
          test.skip(true, "converse endpoint unreachable in this environment");
          return;
        }

        // ── Transcript: both messages render ──────────────────────────
        // The user bubble is always the most recent user-role message.
        const userBubbles = page.locator('[data-testid^="message-user-"]');
        await expect(userBubbles.last()).toContainText(`tag ${stamp}`);

        // The assistant bubble immediately follows the user bubble.
        const assistantBubbles = page.locator(
          '[data-testid^="message-assistant-"]',
        );
        const assistantCount = await assistantBubbles.count();
        expect(assistantCount).toBeGreaterThan(0);
        const lastAssistantText =
          (await assistantBubbles.last().textContent()) ?? "";
        expect(lastAssistantText.trim().length).toBeGreaterThan(0);
        // The reply text should match what the server returned (which
        // is also what got persisted), ruling out a stale render.
        expect(lastAssistantText).toContain(result.reply.content);

        // ── DB: conversation grew by exactly the new pair ─────────────
        const after = await readPillarContent(user.userId);
        expect(after).not.toBeNull();
        const afterConversation = (after as Record<string, unknown>)
          .conversation as Array<{ role: string; content: string }>;
        expect(Array.isArray(afterConversation)).toBe(true);
        // The route caps history at 20 entries, so use ">=" rather than
        // an exact +2 — but for a fresh user we should always see at
        // least the new user msg + DW reply.
        expect(afterConversation.length).toBeGreaterThanOrEqual(
          beforeConversation.length + 2,
        );
        const lastUserMsg = [...afterConversation]
          .reverse()
          .find((m) => m.role === "user");
        expect(lastUserMsg?.content).toContain(`tag ${stamp}`);
        const lastAssistantMsg = [...afterConversation]
          .reverse()
          .find((m) => m.role === "assistant");
        expect(lastAssistantMsg?.content).toBe(result.reply.content);

        // ── DB: at least one structured field was captured ────────────
        // We check both via the route's own capturedFields summary AND
        // by reading the row, so a regression in either the response
        // shape or the persistence step would fail this test.
        const STRUCTURED_FIELDS = [
          "description",
          "userVoice",
          "weeklyRhythm",
          "laws",
          "nonNegotiables",
        ] as const;

        const captured = result.capturedFields ?? [];
        // It's acceptable for the LLM to take more than one turn to
        // capture a field. If the first turn captured nothing, send a
        // second, even more explicit message and re-check.
        let finalContent = after as Record<string, unknown>;
        if (captured.length === 0) {
          const followUp = await sendMessage(
            page,
            `To be explicit: please save the description as ` +
              `"A bright minimal apartment full of plants (tag ${stamp})." ` +
              `And save my own words as "My space is my sanctuary."`,
          );
          if (!followUp) {
            test.skip(
              true,
              "converse endpoint unreachable on follow-up message",
            );
            return;
          }
          const after2 = await readPillarContent(user.userId);
          expect(after2).not.toBeNull();
          finalContent = after2 as Record<string, unknown>;
        }

        const updatedFields = STRUCTURED_FIELDS.filter((field) => {
          const beforeVal = (before as Record<string, unknown>)[field];
          const afterVal = finalContent[field];
          if (Array.isArray(afterVal)) {
            return (
              JSON.stringify(beforeVal ?? []) !== JSON.stringify(afterVal)
            );
          }
          return (
            typeof afterVal === "string" &&
            afterVal.trim().length > 0 &&
            afterVal !== beforeVal
          );
        });
        expect(
          updatedFields.length,
          `Expected at least one of ${STRUCTURED_FIELDS.join(", ")} ` +
            `to change after the converse round-trip; row content was: ` +
            `${JSON.stringify(finalContent)}`,
        ).toBeGreaterThan(0);
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });

  test("Clear conversation empties both the transcript and the DB row", async ({
    browser,
  }) => {
    const user = await registerUser("pillar-converse-clear");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);
        const page = await context.newPage();
        await setOnboardingCompleted(page);

        // The AccountabilityCheckIn dialog auto-opens 1.8s after mount
        // when the server reports needsCheckIn=true. Its overlay would
        // then intercept clicks on the conversation overflow menu trigger.
        // Pre-seed the dismiss keys for every known timeContext so the
        // modal never opens during this test. See
        // client/src/components/accountability-check-in.tsx for the key
        // format and the timeContext enum.
        await page.addInitScript(() => {
          const FAR_FUTURE = String(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const CONTEXTS = [
            "prime_evening",
            "late_night",
            "very_late",
            "missed_morning",
            "missed_day_start",
            "missed_afternoon",
          ];
          for (const c of CONTEXTS) {
            try {
              localStorage.setItem("dw_checkin_dismissed_" + c, FAR_FUTURE);
            } catch {
              /* ignore */
            }
          }
        });

        await page.goto(`/life-system/pillar/${PILLAR_ID}`, {
          waitUntil: "domcontentloaded",
        });

        const chatInput = page.getByTestId("input-converse-message");
        await expect(chatInput).toBeVisible({ timeout: 30_000 });

        // 1. Seed a conversation so there's something to clear.
        const stamp = Date.now().toString(36);
        const result = await sendMessage(
          page,
          `Quick note about my physical environment (tag ${stamp}): ` +
            `it is a bright minimal apartment full of plants.`,
        );
        if (!result) {
          test.skip(true, "converse endpoint unreachable in this environment");
          return;
        }

        // Sanity: at least one user bubble rendered and the DB row has
        // a non-empty conversation array.
        await expect(
          page.locator('[data-testid^="message-user-"]').last(),
        ).toContainText(`tag ${stamp}`);
        const seeded = await readPillarContent(user.userId);
        expect(seeded).not.toBeNull();
        const seededConv = (seeded as Record<string, unknown>)
          .conversation as unknown[];
        expect(Array.isArray(seededConv)).toBe(true);
        expect(seededConv.length).toBeGreaterThan(0);

        // 2. Open the conversation overflow menu and click "Clear
        // conversation". The handler triggers a window.confirm() —
        // accept it before clicking so the click handler resolves.
        page.once("dialog", (dialog) => {
          void dialog.accept();
        });
        await page.getByTestId("button-conversation-menu").click();
        const clearItem = page.getByTestId("menu-item-clear-conversation");
        await expect(clearItem).toBeVisible();

        // The clear path issues a PATCH /api/life-system/pillars/:id
        // with conversation: []. Wait for that response so we don't
        // race the cache invalidation.
        const patchPromise = page.waitForResponse(
          (r) =>
            r.request().method() === "PATCH" &&
            new URL(r.url()).pathname ===
              `/api/life-system/pillars/${PILLAR_ID}`,
          { timeout: 20_000 },
        );
        await clearItem.click();
        const patchRes = await patchPromise;
        expect(patchRes.ok()).toBe(true);

        // 3. UI: the transcript no longer contains the seeded user
        // message. (The card itself stays mounted and falls back to
        // rendering DW's opening question as a preview bubble.)
        await expect(
          page.locator('[data-testid^="message-user-"]'),
        ).toHaveCount(0, { timeout: 10_000 });
        await expect(
          page.locator('[data-testid^="message-assistant-"]'),
        ).toHaveCount(1);

        // 4. DB: the row still exists but content.conversation is
        // gone (saveContentPatch sends conversation: [], which the
        // PATCH handler stores; the page treats both [] and undefined
        // as "empty").
        const cleared = await readPillarContent(user.userId);
        expect(cleared).not.toBeNull();
        const clearedConv = (cleared as Record<string, unknown>)
          .conversation;
        const isEmpty =
          clearedConv === undefined ||
          clearedConv === null ||
          (Array.isArray(clearedConv) && clearedConv.length === 0);
        expect(
          isEmpty,
          `Expected content.conversation to be empty/undefined after ` +
            `clear; got: ${JSON.stringify(clearedConv)}`,
        ).toBe(true);
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });
});

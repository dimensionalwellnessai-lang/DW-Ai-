import { test, expect } from "@playwright/test";
import {
  applyAuth,
  cleanupUser,
  registerUser,
  setOnboardingCompleted,
  withDb,
} from "./helpers";

/**
 * End-to-end coverage for the four inline editors on /life-system/pillar/:id.
 *
 * What this exercises:
 *   - Description, "In your own words" (userVoice), "Weekly rhythm"
 *     (weeklyRhythm), and "Non-negotiables" all save through
 *     PATCH /api/life-system/pillars/:pillarId and survive a hard reload
 *     (which re-runs the GET /api/life-system/pillars query and rehydrates
 *     each draft state from the server's content blob).
 *   - Saving an empty string for a text field clears it on the server
 *     (the row's content.<field> becomes undefined / absent), which the
 *     reloaded page then renders as an empty textarea.
 *
 * We use the "physical_environment" pillar — it's a Core pillar that the
 * Life System backfill always enables for new users with non-empty starter
 * content, so the page renders without us needing to seed anything first.
 *
 * Why a hard reload: the page mirrors saved content into local React state
 * (descDraft / voiceDraft / rhythmDraft / nnDraft), so just reading the
 * draft after a save would only prove the optimistic mirror updated. A
 * full reload forces the value to come back through the server.
 */

const PILLAR_ID = "physical_environment";

test.describe("Pillar inline editors", () => {
  test("edits all four inline fields and persists across reload", async ({
    browser,
  }) => {
    const user = await registerUser("pillar-editors");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);
        const page = await context.newPage();
        await setOnboardingCompleted(page);

        await page.goto(`/life-system/pillar/${PILLAR_ID}`, {
          waitUntil: "domcontentloaded",
        });

        // Wait for the editors to mount (the page shows a spinner while
        // the Life System query is loading).
        const description = page.getByTestId("textarea-description");
        await expect(description).toBeVisible({ timeout: 30_000 });

        const stamp = Date.now().toString(36);
        const newDescription = `E2E description ${stamp}`;
        const newVoice = `E2E voice ${stamp}`;
        const newRhythm = `E2E rhythm ${stamp}`;
        const newNonNegotiable = `E2E non-negotiable ${stamp}`;

        // ── Description ────────────────────────────────────────────────
        await description.fill(newDescription);
        const saveDescription = page.getByTestId("button-save-description");
        await expect(saveDescription).toBeEnabled();
        await saveDescription.click();
        // Save is debounced behind the mutation; wait for the button to
        // settle back to "disabled" (draft === saved value) before moving
        // on so we don't reload mid-flight.
        await expect(saveDescription).toBeDisabled();

        // ── User voice ────────────────────────────────────────────────
        const userVoice = page.getByTestId("textarea-user-voice");
        await userVoice.fill(newVoice);
        const saveUserVoice = page.getByTestId("button-save-user-voice");
        await expect(saveUserVoice).toBeEnabled();
        await saveUserVoice.click();
        await expect(saveUserVoice).toBeDisabled();

        // ── Weekly rhythm ─────────────────────────────────────────────
        const weeklyRhythm = page.getByTestId("textarea-weekly-rhythm");
        await weeklyRhythm.fill(newRhythm);
        const saveWeeklyRhythm = page.getByTestId("button-save-weekly-rhythm");
        await expect(saveWeeklyRhythm).toBeEnabled();
        await saveWeeklyRhythm.click();
        await expect(saveWeeklyRhythm).toBeDisabled();

        // ── Non-negotiables ────────────────────────────────────────────
        // Add a new row and type a unique value into it. We grab the new
        // input by `.last()` rather than by index so the test doesn't
        // assume the click-handler appends (vs. prepends or sorts).
        const initialRows = await page
          .locator('[data-testid^="row-non-negotiable-"]')
          .count();
        await page.getByTestId("button-add-non-negotiable").click();
        const newRowInput = page
          .locator('[data-testid^="input-non-negotiable-"]')
          .last();
        await expect(newRowInput).toBeVisible();
        await newRowInput.fill(newNonNegotiable);
        const saveNonNegotiables = page.getByTestId(
          "button-save-non-negotiables",
        );
        await expect(saveNonNegotiables).toBeEnabled();
        await saveNonNegotiables.click();
        await expect(saveNonNegotiables).toBeDisabled();

        // ── Reload and verify everything came back from the server ────
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("textarea-description")).toHaveValue(
          newDescription,
          { timeout: 30_000 },
        );
        await expect(page.getByTestId("textarea-user-voice")).toHaveValue(
          newVoice,
        );
        await expect(page.getByTestId("textarea-weekly-rhythm")).toHaveValue(
          newRhythm,
        );

        // The newly-added non-negotiable should appear in *some* row after
        // reload. We don't assume it's at the same index because the
        // server may sort or filter the list.
        const nonNegotiableInputs = page.locator(
          '[data-testid^="input-non-negotiable-"]',
        );
        const inputCount = await nonNegotiableInputs.count();
        expect(inputCount).toBeGreaterThanOrEqual(initialRows + 1);
        const values = await nonNegotiableInputs.evaluateAll(
          (els) => (els as HTMLInputElement[]).map((e) => e.value),
        );
        expect(values).toContain(newNonNegotiable);

        // Also assert the database row directly so a regression in the
        // GET serialiser can't mask a regression in the PATCH writer.
        const dbRow = await withDb(async (db) => {
          const r = await db.query<{ content: Record<string, unknown> | null }>(
            `SELECT content FROM life_system_pillars
              WHERE user_id = $1 AND pillar_id = $2`,
            [user.userId, PILLAR_ID],
          );
          return r.rows[0]?.content ?? null;
        });
        expect(dbRow).not.toBeNull();
        expect(dbRow!.description).toBe(newDescription);
        expect(dbRow!.userVoice).toBe(newVoice);
        expect(dbRow!.weeklyRhythm).toBe(newRhythm);
        expect(Array.isArray(dbRow!.nonNegotiables)).toBe(true);
        expect(dbRow!.nonNegotiables as string[]).toContain(newNonNegotiable);
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });

  test("saving empty values clears the field on the server", async ({
    browser,
  }) => {
    const user = await registerUser("pillar-editors-clear");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);
        const page = await context.newPage();
        await setOnboardingCompleted(page);

        await page.goto(`/life-system/pillar/${PILLAR_ID}`, {
          waitUntil: "domcontentloaded",
        });

        const description = page.getByTestId("textarea-description");
        await expect(description).toBeVisible({ timeout: 30_000 });

        // 1. Save known values for all three text fields so we have
        // something to clear.
        const stamp = Date.now().toString(36);
        const seedDescription = `E2E seed desc ${stamp}`;
        const seedVoice = `E2E seed voice ${stamp}`;
        const seedRhythm = `E2E seed rhythm ${stamp}`;

        await description.fill(seedDescription);
        const saveDescription = page.getByTestId("button-save-description");
        await saveDescription.click();
        await expect(saveDescription).toBeDisabled();

        await page.getByTestId("textarea-user-voice").fill(seedVoice);
        const saveUserVoice = page.getByTestId("button-save-user-voice");
        await saveUserVoice.click();
        await expect(saveUserVoice).toBeDisabled();

        await page.getByTestId("textarea-weekly-rhythm").fill(seedRhythm);
        const saveWeeklyRhythm = page.getByTestId("button-save-weekly-rhythm");
        await saveWeeklyRhythm.click();
        await expect(saveWeeklyRhythm).toBeDisabled();

        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("textarea-description")).toHaveValue(
          seedDescription,
          { timeout: 30_000 },
        );
        await expect(page.getByTestId("textarea-user-voice")).toHaveValue(
          seedVoice,
        );
        await expect(page.getByTestId("textarea-weekly-rhythm")).toHaveValue(
          seedRhythm,
        );

        // 2. Clear each text field and save again. All three share the
        // same trim-or-undefined patch logic in saveContentPatch, but
        // we exercise each one explicitly so a future change to a
        // single handler can't slip through unnoticed.
        await page.getByTestId("textarea-description").fill("");
        const saveDescription2 = page.getByTestId("button-save-description");
        await expect(saveDescription2).toBeEnabled();
        await saveDescription2.click();
        await expect(saveDescription2).toBeDisabled();

        await page.getByTestId("textarea-user-voice").fill("");
        const saveUserVoice2 = page.getByTestId("button-save-user-voice");
        await expect(saveUserVoice2).toBeEnabled();
        await saveUserVoice2.click();
        await expect(saveUserVoice2).toBeDisabled();

        await page.getByTestId("textarea-weekly-rhythm").fill("");
        const saveWeeklyRhythm2 = page.getByTestId(
          "button-save-weekly-rhythm",
        );
        await expect(saveWeeklyRhythm2).toBeEnabled();
        await saveWeeklyRhythm2.click();
        await expect(saveWeeklyRhythm2).toBeDisabled();

        // 3. Reload and verify all three textareas are empty.
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("textarea-description")).toHaveValue("", {
          timeout: 30_000,
        });
        await expect(page.getByTestId("textarea-user-voice")).toHaveValue("");
        await expect(page.getByTestId("textarea-weekly-rhythm")).toHaveValue(
          "",
        );

        // 4. All three text fields should be absent from the DB row's
        // content (saved as undefined and stripped by JSON.stringify).
        const dbRow = await withDb(async (db) => {
          const r = await db.query<{ content: Record<string, unknown> | null }>(
            `SELECT content FROM life_system_pillars
              WHERE user_id = $1 AND pillar_id = $2`,
            [user.userId, PILLAR_ID],
          );
          return r.rows[0]?.content ?? null;
        });
        expect(dbRow).not.toBeNull();
        expect(dbRow!.description).toBeUndefined();
        expect(dbRow!.userVoice).toBeUndefined();
        expect(dbRow!.weeklyRhythm).toBeUndefined();

        // 5. Repeat for non-negotiables: removing every row and saving
        // should also clear the field on the server. The list editor
        // takes a slightly different code path (filter Boolean + length
        // check in onSaveNonNegotiables) so it's worth a separate
        // assertion.
        const removeButtons = page.locator(
          '[data-testid^="button-remove-non-negotiable-"]',
        );
        // Click from the last row backwards so the indices we already
        // resolved don't shift out from under us mid-loop.
        let remaining = await removeButtons.count();
        while (remaining > 0) {
          await removeButtons.last().click();
          remaining = await removeButtons.count();
        }
        const saveNn = page.getByTestId("button-save-non-negotiables");
        await expect(saveNn).toBeEnabled();
        await saveNn.click();
        await expect(saveNn).toBeDisabled();

        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(
          page.getByTestId("text-non-negotiables-empty"),
        ).toBeVisible({ timeout: 30_000 });

        const dbRowAfterNn = await withDb(async (db) => {
          const r = await db.query<{ content: Record<string, unknown> | null }>(
            `SELECT content FROM life_system_pillars
              WHERE user_id = $1 AND pillar_id = $2`,
            [user.userId, PILLAR_ID],
          );
          return r.rows[0]?.content ?? null;
        });
        expect(dbRowAfterNn).not.toBeNull();
        expect(dbRowAfterNn!.nonNegotiables).toBeUndefined();
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });
});

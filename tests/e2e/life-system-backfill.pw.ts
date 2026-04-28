import { test, expect, type BrowserContext } from "@playwright/test";
import {
  applyAuth,
  cleanupUser,
  registerUser,
  setOnboardingCompleted,
  type RegisteredUser,
} from "./helpers";

const STORAGE_KEY_PREFIX = "life-system:backfill-note:";

async function readStoredNote(
  context: BrowserContext,
  userId: string,
): Promise<{ carried: unknown; dismissed: unknown } | null> {
  const page = context.pages()[0] ?? (await context.newPage());
  return page.evaluate(
    ({ key }) => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as { carried: unknown; dismissed: unknown }) : null;
      } catch {
        return null;
      }
    },
    { key: `${STORAGE_KEY_PREFIX}${userId}` },
  );
}

test.describe("Life System backfill banner", () => {
  test("renders for backfilled users, persists across reload, and stays dismissed", async ({
    browser,
  }) => {
    let user: RegisteredUser | null = null;
    user = await registerUser("life-system-backfill");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);
        const page = await context.newPage();
        await setOnboardingCompleted(page);

        // First visit: backfill happens server-side, then the client persists
        // the carried summary to per-user localStorage and shows the banner.
        await page.goto("/life-system", { waitUntil: "domcontentloaded" });

        const banner = page.getByTestId("card-backfill-note");
        await expect(banner).toBeVisible({ timeout: 30_000 });

        await expect(page.getByTestId("text-backfill-note-title")).toHaveText(
          "We set up your Life System",
        );

        // At least one carried-over bullet should render. A freshly registered
        // user with no legacy goals always gets the "Starter Template projects"
        // line from backfillLifeSystemForUser.
        const firstBullet = page.getByTestId("text-backfill-carried-0");
        await expect(firstBullet).toBeVisible();
        await expect(firstBullet).not.toHaveText("");

        // The localStorage key must be namespaced by user id so two accounts
        // on the same browser don't share dismissal state.
        const stored = await readStoredNote(context, user.userId);
        expect(stored).not.toBeNull();
        expect(Array.isArray(stored!.carried)).toBe(true);
        expect((stored!.carried as unknown[]).length).toBeGreaterThan(0);
        expect(stored!.dismissed).toBe(false);

        // A second key (e.g. for a different user) should not exist yet.
        const otherUserStored = await page.evaluate(
          (key) => window.localStorage.getItem(key),
          `${STORAGE_KEY_PREFIX}some-other-user-id`,
        );
        expect(otherUserStored).toBeNull();

        // Reload — the banner survives because the GET no longer returns
        // wasBackfilled=true, but the persisted localStorage entry rehydrates
        // the banner state.
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("card-backfill-note")).toBeVisible({
          timeout: 30_000,
        });
        await expect(page.getByTestId("text-backfill-carried-0")).toBeVisible();

        // Dismiss the banner; it should disappear immediately.
        await page.getByTestId("button-dismiss-backfill-note").click();
        await expect(page.getByTestId("card-backfill-note")).toHaveCount(0);

        const dismissedStored = await readStoredNote(context, user.userId);
        expect(dismissedStored).not.toBeNull();
        expect(dismissedStored!.dismissed).toBe(true);

        // Reload — dismissal must persist.
        await page.reload({ waitUntil: "domcontentloaded" });
        // Wait for the page to fully settle (pillars grid renders) so we don't
        // race the useEffect that reads localStorage.
        await expect(page.getByTestId("page-life-system")).toBeVisible({
          timeout: 30_000,
        });
        await expect(page.getByTestId("card-backfill-note")).toHaveCount(0);
      } finally {
        await context.close();
      }
    } finally {
      if (user) await cleanupUser(user.userId);
    }
  });
});

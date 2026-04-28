import { test, expect, type Page } from "@playwright/test";
import {
  applyAuth,
  cleanupUser,
  registerUser,
  seedMultiSourceWearableData,
  seedWearableData,
  setOnboardingCompleted,
} from "./helpers";

async function countXAxisTicks(page: Page, chartTestId: string): Promise<number> {
  return page.evaluate((id) => {
    const chart = document.querySelector(`[data-testid="${id}"]`);
    if (!chart) return -1;
    const xAxis = chart.querySelector('svg g[class*="recharts-xAxis"]');
    if (!xAxis) return -1;
    return xAxis.querySelectorAll("text").length;
  }, chartTestId);
}

test.describe("Body dashboard wearable trends", () => {
  test("empty state CTA shows and links to /wearable-manager", async ({
    browser,
  }) => {
    const user = await registerUser("trends-empty");
    try {
      const context = await browser.newContext();
      try {
        await applyAuth(context, user);
        const page = await context.newPage();
        await setOnboardingCompleted(page);

        await page.goto("/health-data", { waitUntil: "domcontentloaded" });

        const empty = page.getByTestId("card-wearable-empty");
        await expect(empty).toBeVisible({ timeout: 30_000 });

        const connect = page.getByTestId("button-connect-wearable");
        await expect(connect).toBeVisible();

        const href = await connect.evaluate((btn) => {
          const link = btn.closest("a");
          return link ? link.getAttribute("href") : null;
        });
        expect(href).not.toBeNull();
        expect(href!.endsWith("/wearable-manager")).toBe(true);

        await expect(page.getByTestId("card-wearable-summary")).toHaveCount(0);
        await expect(page.getByTestId("card-wearable-trends")).toHaveCount(0);
        await expect(page.getByTestId("card-wearable-trends-empty")).toHaveCount(0);
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });

  test("seeded data renders trends + 7d/30d toggle re-renders", async ({
    browser,
  }) => {
    const user = await registerUser("trends-full");
    try {
      await seedWearableData(user.userId);

      const context = await browser.newContext();
      try {
        await applyAuth(context, user);
        const page = await context.newPage();
        await setOnboardingCompleted(page);

        await page.goto("/health-data", { waitUntil: "domcontentloaded" });

        const summary = page.getByTestId("card-wearable-summary");
        await expect(summary).toBeVisible({ timeout: 30_000 });

        const trends = page.getByTestId("card-wearable-trends");
        await expect(trends).toBeVisible();

        for (const key of ["hrv", "restingHr", "sleepHours", "steps", "screenTime"]) {
          await expect(page.getByTestId(`chart-wearable-${key}`)).toBeVisible();
        }

        const sevenBtn = page.getByTestId("button-trend-window-7");
        const thirtyBtn = page.getByTestId("button-trend-window-30");

        const sevenClass = (await sevenBtn.getAttribute("class")) ?? "";
        const thirtyClassInitial = (await thirtyBtn.getAttribute("class")) ?? "";
        expect(sevenClass).toContain("bg-primary");
        expect(thirtyClassInitial).not.toContain("bg-primary");

        await page.waitForFunction(
          () => {
            const chart = document.querySelector(
              '[data-testid="chart-wearable-steps"]',
            );
            const xAxis = chart?.querySelector('svg g[class*="recharts-xAxis"]');
            return !!xAxis && xAxis.querySelectorAll("text").length > 0;
          },
          undefined,
          { timeout: 10_000 },
        );

        const ticks7 = await countXAxisTicks(page, "chart-wearable-steps");
        expect(ticks7).toBeGreaterThan(0);

        await thirtyBtn.click();

        await expect.poll(
          async () => (await thirtyBtn.getAttribute("class")) ?? "",
          { timeout: 5_000 },
        ).toContain("bg-primary");
        const sevenClassAfter = (await sevenBtn.getAttribute("class")) ?? "";
        expect(sevenClassAfter).not.toContain("bg-primary");

        for (const key of ["hrv", "restingHr", "sleepHours", "steps", "screenTime"]) {
          await expect(page.getByTestId(`chart-wearable-${key}`)).toBeVisible();
        }

        await expect.poll(
          async () => countXAxisTicks(page, "chart-wearable-steps"),
          { timeout: 5_000 },
        ).toBeGreaterThan(ticks7);
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });

  test("multi-source data renders charts and aggregates summary across sources", async ({
    browser,
  }) => {
    const user = await registerUser("trends-multi");
    try {
      await seedMultiSourceWearableData(user.userId);

      const context = await browser.newContext();
      try {
        await applyAuth(context, user);
        const page = await context.newPage();
        await setOnboardingCompleted(page);

        await page.goto("/health-data", { waitUntil: "domcontentloaded" });

        const summary = page.getByTestId("card-wearable-summary");
        await expect(summary).toBeVisible({ timeout: 30_000 });

        const trends = page.getByTestId("card-wearable-trends");
        await expect(trends).toBeVisible();

        // All five trend charts should render even when the data is split
        // across two sources.
        for (const key of ["hrv", "restingHr", "sleepHours", "steps", "screenTime"]) {
          await expect(page.getByTestId(`chart-wearable-${key}`)).toBeVisible();
        }

        // Steps in the last 24h are reconciled across sources by taking the
        // MAX per source (rather than blindly summing) so two devices that
        // both tracked the same day don't show triple-counted totals.
        // Whoop reports 8,000 and Apple Health 2,500, so we expect 8,000.
        await expect(page.getByTestId("stat-wearable-steps")).toHaveText("8,000");

        // Sleep follows the same dedupe rule: max(420, 380) = 420 minutes,
        // displayed as "7.0h" — a realistic single-night value rather than
        // the previous "13.3h" that came from blindly adding both sources.
        await expect(page.getByTestId("stat-wearable-sleep")).toHaveText("7.0h");

        // HRV / resting HR pick the most recent reading. Whoop rows are
        // recorded ~1 minute ago and Apple Health ~2 minutes ago, so the
        // Whoop values (55 ms / 60 bpm) win.
        await expect(page.getByTestId("stat-wearable-hrv")).toHaveText("55 ms");
        await expect(page.getByTestId("stat-wearable-rhr")).toHaveText("60 bpm");

        // Screen time still renders from the single screen-time source.
        await expect(page.getByTestId("stat-wearable-screentime")).not.toHaveText("—");

        // The trend chart x-axes should populate for both sources too — wait
        // until at least the steps chart has rendered ticks, then sanity
        // check the HRV chart (whose data comes from BOTH whoop + apple).
        await page.waitForFunction(
          () => {
            const chart = document.querySelector(
              '[data-testid="chart-wearable-steps"]',
            );
            const xAxis = chart?.querySelector('svg g[class*="recharts-xAxis"]');
            return !!xAxis && xAxis.querySelectorAll("text").length > 0;
          },
          undefined,
          { timeout: 10_000 },
        );
        const hrvTicks = await countXAxisTicks(page, "chart-wearable-hrv");
        expect(hrvTicks).toBeGreaterThan(0);
      } finally {
        await context.close();
      }
    } finally {
      await cleanupUser(user.userId);
    }
  });
});

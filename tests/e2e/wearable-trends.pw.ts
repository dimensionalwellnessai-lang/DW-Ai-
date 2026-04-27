import { test, expect, type Page } from "@playwright/test";
import {
  applyAuth,
  cleanupUser,
  registerUser,
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
});

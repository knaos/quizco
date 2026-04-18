import { expect, test } from "@playwright/test";

test.describe("demo route", () => {
  test("renders the Jerusalem wall highscores sketch", async ({ page }) => {
    await page.goto("/demo");

    await expect(page.getByTestId("demo-route")).toBeVisible();
    await expect(page.getByTestId("demo-leaderboard")).toBeVisible();
    await expect(page.getByTestId("demo-team-judah")).toBeVisible();
    await expect(page.getByTestId("demo-team-benjamin")).toBeVisible();
    await expect(page.getByTestId("demo-team-levi")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(1);
  });
});


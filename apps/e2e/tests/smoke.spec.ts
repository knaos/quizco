import { expect, test } from "@playwright/test";

test.describe("Quizco smoke flows", () => {
  test("renders host login controls", async ({ page }) => {
    await page.goto("/host");

    await expect(page.getByTestId("host-login-form")).toBeVisible();
    await expect(page.getByTestId("host-password-input")).toBeVisible();
    await expect(page.getByTestId("host-login-submit")).toBeVisible();
  });

  test("keeps the host on the login form after an unauthorized login response", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });

    await page.goto("/host");
    await page.getByTestId("host-password-input").fill("wrong-password");
    await page.getByTestId("host-login-submit").click();

    await expect(page.getByTestId("host-login-form")).toBeVisible();
  });

  test("transitions from quiz selection to team join form", async ({ page }) => {
    await page.route("**/api/competitions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "comp-e2e-1",
            title: "E2E Competition",
            status: "ACTIVE",
          },
        ]),
      });
    });

    await page.goto("/play");

    await expect(page.getByTestId("competition-selector")).toBeVisible();
    await page.getByTestId("competition-option-comp-e2e-1").click();

    await expect(page.getByTestId("join-team-form")).toBeVisible();
    await expect(page.getByTestId("team-name-input")).toBeVisible();
    await expect(page.getByTestId("join-team-submit")).toBeVisible();
  });
});

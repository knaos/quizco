import { expect, test } from "@playwright/test";

test.describe("admin competition import", () => {
  test("imports competition from JSON and opens it in editor", async ({ page }) => {
    await page.goto("/admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByTestId("admin-import-competition-trigger")).toBeVisible();

    const importPayload = {
      competition: {
        title: `E2E Imported ${Date.now()}`,
        host_pin: "4444",
        status: "DRAFT",
      },
      rounds: [
        {
          title: "Round 1",
          type: "STANDARD",
          questions: [
            {
              questionText: "Imported Q1",
              type: "OPEN_WORD",
              points: 1,
              timeLimitSeconds: 30,
              grading: "AUTO",
              content: { answer: "test" },
            },
          ],
        },
      ],
    };

    await page.getByTestId("admin-import-file-input").setInputFiles({
      name: "competition-import.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(importPayload), "utf8"),
    });

    await expect(page.getByTestId("admin-import-status")).toBeVisible();
    await expect(page.getByText(importPayload.competition.title)).toBeVisible();

    await page.getByText(importPayload.competition.title).first().click();
    await expect(page.getByRole("heading", { name: importPayload.competition.title })).toBeVisible();
  });

  test("shows error message for invalid import JSON", async ({ page }) => {
    await page.goto("/admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('form button[type="submit"]').click();

    await page.getByTestId("admin-import-file-input").setInputFiles({
      name: "competition-import-invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{ invalid", "utf8"),
    });

    await expect(page.getByTestId("admin-import-status")).toBeVisible();
    await expect(page.getByTestId("admin-import-status")).toContainText("JSON");
  });
});

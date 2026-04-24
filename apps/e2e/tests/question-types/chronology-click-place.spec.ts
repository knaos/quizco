import { expect, test, type Page } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  movePreviewToActive,
  moveToQuestionPreview,
} from "../helpers/gameHarness";

const attemptDragByItem = async (
  page: Page,
  itemTestId: string,
  targetTestId: string,
): Promise<void> => {
  const item = page.getByTestId(itemTestId);
  const target = page.getByTestId(targetTestId).first();

  await expect(item).toBeVisible();
  await expect(target).toBeVisible();

  const itemBox = await item.boundingBox();
  const targetBox = await target.boundingBox();

  if (!itemBox || !targetBox) {
    throw new Error("Unable to compute drag coordinates for chronology click-place test.");
  }

  const startX = itemBox.x + itemBox.width / 2;
  const startY = itemBox.y + itemBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 10, startY + 10, { steps: 2 });
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.up();
};

test("Chronology supports click-to-place interaction", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Chronology Click Place",
      [
        {
          questionText: "Chronology click to place question",
          type: "CHRONOLOGY",
          content: {
            items: [
              { id: "c1", text: "First", order: 0 },
              { id: "c2", text: "Second", order: 1 },
            ],
          },
        },
      ],
    );
    competitionId = fixture.competitionId;

    session = await createHostAndPlayers(
      browser,
      competitionId,
      "Chronology Click Team One",
      "Chronology Click Team Two",
    );

    await moveToQuestionPreview(session.hostPage);
    await movePreviewToActive(session.hostPage, "CHRONOLOGY");

    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
      timeout: 20_000,
    });

    // Click on a card to select it
    await session.playerOnePage.getByTestId("chronology-item-c1").click();

    // Verify card is selected (has selection styling)
    const card = session.playerOnePage.getByTestId("chronology-item-c1");
    await expect(card).toHaveClass(/ring-4/);

    // Drag should be disabled while a card is selected for click placement.
    await attemptDragByItem(session.playerOnePage, "chronology-item-c1", "chronology-slot-0");
    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).not.toContainText("First");
    await expect(session.playerOnePage.getByTestId("chronology-pool-dropzone")).toContainText("First");

    // Click on slot 0 to place the selected card
    await session.playerOnePage.getByTestId("chronology-slot-0").click();

    // Verify card is now in slot 0
    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).toContainText("First");

    // Click on second card to select it
    await session.playerOnePage.getByTestId("chronology-item-c2").click();

    // Click on slot 1 to place the selected card
    await session.playerOnePage.getByTestId("chronology-slot-1").click();

    // Verify second card is now in slot 1
    await expect(session.playerOnePage.getByTestId("chronology-slot-1")).toContainText("Second");

    // Pool should now be empty
    await expect(
      session.playerOnePage
        .getByTestId("chronology-pool-dropzone")
        .getByTestId(/chronology-item-/),
    ).toHaveCount(0);

    // Submit answer
    await session.playerOnePage.getByTestId("player-submit-answer").click();
    await session.playerTwoPage.getByTestId("player-submit-answer").click();
    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
      timeout: 20_000,
    });
  } finally {
    if (competitionId) {
      await deleteCompetition(adminApi, competitionId);
    }
    if (session) {
      await session.close();
    }
    await adminApi.dispose();
  }
});

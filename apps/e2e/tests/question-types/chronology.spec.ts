import { expect, test, type Page } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  movePreviewToActive,
  moveToQuestionPreview,
} from "../helpers/gameHarness";
import { QUESTION_TYPE_SCENARIOS, runQuestionTypeScenario } from "../helpers/questionTypeScenarios";

test("Question type flow: CHRONOLOGY", async ({ browser }) => {
  await runQuestionTypeScenario(browser, QUESTION_TYPE_SCENARIOS.CHRONOLOGY);
});

const dragByHandle = async (
  page: Page,
  handleTestId: string,
  targetTestId: string,
): Promise<void> => {
  const handle = page.getByTestId(handleTestId);
  const target = page.getByTestId(targetTestId);

  await expect(handle).toBeVisible();
  await expect(target).toBeVisible();

  const handleBox = await handle.boundingBox();
  const targetBox = await target.boundingBox();

  if (!handleBox || !targetBox) {
    throw new Error("Unable to compute drag coordinates for chronology drag test.");
  }

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 10, startY + 10, { steps: 2 });
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.up();
};

test("Chronology allows moving an item back to left pool after pool is empty", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Chronology Drag Back",
      [
        {
          questionText: "Chronology drag back question",
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
      "Chronology Drag Team One",
      "Chronology Drag Team Two",
    );

    await moveToQuestionPreview(session.hostPage);
    await movePreviewToActive(session.hostPage, "CHRONOLOGY");

    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
      timeout: 20_000,
    });

    await dragByHandle(session.playerOnePage, "chronology-handle-c1", "chronology-slot-0");
    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).toContainText("First");

    await dragByHandle(session.playerOnePage, "chronology-handle-c2", "chronology-slot-1");
    await expect(session.playerOnePage.getByTestId("chronology-slot-1")).toContainText("Second");

    await expect(
      session.playerOnePage
        .getByTestId("chronology-pool-dropzone")
        .getByTestId(/chronology-item-/),
    ).toHaveCount(0);

    await dragByHandle(session.playerOnePage, "chronology-handle-c1", "chronology-pool-dropzone");

    await expect(
      session.playerOnePage
        .getByTestId("chronology-pool-dropzone")
        .getByTestId("chronology-item-c1"),
    ).toBeVisible();
    await expect(
      session.playerOnePage.getByTestId("chronology-slot-0").getByTestId("chronology-item-c1"),
    ).toHaveCount(0);
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

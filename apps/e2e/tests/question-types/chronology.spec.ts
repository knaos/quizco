import { expect, test, type Page } from "@playwright/test";
import {
  clickHostNextAndExpectPhase,
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

const dragByItem = async (
  page: Page,
  itemTestId: string,
  targetTestId: string,
): Promise<void> => {
  const item = page.getByTestId(itemTestId).first();
  const target = page.getByTestId(targetTestId).first();

  await expect(item).toBeVisible();
  await expect(target).toBeVisible();

  const itemBox = await item.boundingBox();
  const targetBox = await target.boundingBox();

  if (!itemBox || !targetBox) {
    throw new Error("Unable to compute drag coordinates for chronology drag test.");
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

    await dragByItem(session.playerOnePage, "chronology-item-c1", "chronology-slot-0");
    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).toContainText("First");

    await dragByItem(session.playerOnePage, "chronology-item-c2", "chronology-slot-1");
    await expect(session.playerOnePage.getByTestId("chronology-slot-1")).toContainText("Second");

    await expect(
      session.playerOnePage
        .getByTestId("chronology-pool-dropzone")
        .getByTestId(/chronology-item-/),
    ).toHaveCount(0);

    await dragByItem(session.playerOnePage, "chronology-item-c1", "chronology-pool-dropzone");
    await expect(
      session.playerOnePage
        .getByTestId("chronology-pool-dropzone")
        .getByTestId("chronology-item-c1"),
    ).toHaveCount(1);
    await expect(
      session.playerOnePage
        .getByTestId("chronology-slot-0")
        .getByTestId("chronology-item-c1"),
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

test("Chronology selector supports slot swap and pool item insertion targets", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Chronology Selector Targets",
      [
        {
          questionText: "Chronology selector target question",
          type: "CHRONOLOGY",
          content: {
            items: [
              { id: "c1", text: "One", order: 0 },
              { id: "c2", text: "Two", order: 1 },
              { id: "c3", text: "Three", order: 2 },
            ],
          },
        },
      ],
    );
    competitionId = fixture.competitionId;

    session = await createHostAndPlayers(
      browser,
      competitionId,
      "Chronology Selector Team One",
      "Chronology Selector Team Two",
    );

    await moveToQuestionPreview(session.hostPage);
    await movePreviewToActive(session.hostPage, "CHRONOLOGY");

    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
      timeout: 20_000,
    });

    await dragByItem(session.playerOnePage, "chronology-item-c1", "chronology-slot-0");
    await dragByItem(session.playerOnePage, "chronology-item-c2", "chronology-slot-1");
    await dragByItem(session.playerOnePage, "chronology-item-c3", "chronology-slot-2");
    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).toContainText("One");
    await expect(session.playerOnePage.getByTestId("chronology-slot-1")).toContainText("Two");
    await expect(session.playerOnePage.getByTestId("chronology-slot-2")).toContainText("Three");

    await dragByItem(session.playerTwoPage, "chronology-item-c1", "chronology-slot-0");
    await dragByItem(session.playerTwoPage, "chronology-item-c2", "chronology-slot-1");
    await dragByItem(session.playerTwoPage, "chronology-item-c3", "chronology-slot-2");

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

test("Chronology drag placement inserts into middle and shifts later items", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Chronology Drag Insert Middle",
      [
        {
          questionText: "Chronology drag insert middle question",
          type: "CHRONOLOGY",
          content: {
            items: [
              { id: "c1", text: "One", order: 0 },
              { id: "c2", text: "Two", order: 1 },
              { id: "c3", text: "Three", order: 2 },
            ],
          },
        },
      ],
    );
    competitionId = fixture.competitionId;

    session = await createHostAndPlayers(
      browser,
      competitionId,
      "Chronology Drag Insert Team One",
      "Chronology Drag Insert Team Two",
    );

    await moveToQuestionPreview(session.hostPage);
    await movePreviewToActive(session.hostPage, "CHRONOLOGY");

    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
      timeout: 20_000,
    });

    await dragByItem(session.playerOnePage, "chronology-item-c1", "chronology-slot-0");
    await dragByItem(session.playerOnePage, "chronology-item-c3", "chronology-slot-1");

    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).toContainText("One");
    await expect(session.playerOnePage.getByTestId("chronology-slot-1")).toContainText("Three");

    await dragByItem(session.playerOnePage, "chronology-item-c2", "chronology-slot-1");

    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).toContainText("One");
    await expect(session.playerOnePage.getByTestId("chronology-slot-1")).toContainText("Two");
    await expect(session.playerOnePage.getByTestId("chronology-slot-2")).toContainText("Three");
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

test("Chronology reveal phase shows correct/incorrect badge with score count", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Chronology Reveal Badge",
      [
        {
          questionText: "Chronology reveal badge test question",
          type: "CHRONOLOGY",
          content: {
            items: [
              { id: "e1", text: "First Event", order: 0 },
              { id: "e2", text: "Second Event", order: 1 },
              { id: "e3", text: "Third Event", order: 2 },
            ],
          },
        },
      ],
    );
    competitionId = fixture.competitionId;

    session = await createHostAndPlayers(
      browser,
      competitionId,
      "Chronology Badge Team One",
      "Chronology Badge Team Two",
    );

    await moveToQuestionPreview(session.hostPage);
    await movePreviewToActive(session.hostPage, "CHRONOLOGY");

    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
      timeout: 20_000,
    });

    // Player 1 places items in CORRECT order (e1->0, e2->1, e3->2)
    await dragByItem(session.playerOnePage, "chronology-item-e1", "chronology-slot-0");
    await dragByItem(session.playerOnePage, "chronology-item-e2", "chronology-slot-1");
    await dragByItem(session.playerOnePage, "chronology-item-e3", "chronology-slot-2");

    // Player 2 places items in WRONG order (e3->0, e1->1, e2->2)
    await dragByItem(session.playerTwoPage, "chronology-item-e3", "chronology-slot-0");
    await dragByItem(session.playerTwoPage, "chronology-item-e1", "chronology-slot-1");
    await dragByItem(session.playerTwoPage, "chronology-item-e2", "chronology-slot-2");

    // Both submit
    await session.playerOnePage.getByTestId("player-submit-answer").click();
    await session.playerTwoPage.getByTestId("player-submit-answer").click();

    // Wait for grading
    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
      timeout: 20_000,
    });

    // Host reveals answer
    await clickHostNextAndExpectPhase(session.hostPage, "REVEAL_ANSWER");

    // Wait for reveal phase on player side
    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("REVEAL_ANSWER", {
      timeout: 20_000,
    });
    await expect(session.playerTwoPage.getByTestId("player-phase")).toHaveText("REVEAL_ANSWER", {
      timeout: 20_000,
    });

    // Player 1 should have correct score badge (3/3 - green)
    await expect(session.playerOnePage.getByText("3/3")).toBeVisible();
    await expect(session.playerTwoPage.getByText("3/3")).toHaveCount(0);
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

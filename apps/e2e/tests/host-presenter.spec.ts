import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  moveToQuestionPreview,
} from "./helpers/gameHarness";

let adminApi: APIRequestContext;
let competitionId = "";

test.beforeAll(async () => {
  adminApi = await createAdminApi();

  const fixture = await createCompetitionWithQuestions(adminApi, "E2E Host Presenter", [
    {
      questionText: "Presenter question one",
      source: "Йоан 3:16",
      timeLimitSeconds: 15,
      type: "MULTIPLE_CHOICE",
      content: {
        options: ["Alpha", "Beta"],
        correctIndices: [0],
      },
    },
    {
      questionText: "Presenter question two",
      source: "Йоан 3:16",
      timeLimitSeconds: 15,
      type: "MULTIPLE_CHOICE",
      content: {
        options: ["Noah", "Moses"],
        correctIndices: [0],
      },
    },
  ]);

  competitionId = fixture.competitionId;
});

test.afterAll(async () => {
  if (competitionId) {
    await deleteCompetition(adminApi, competitionId);
  }
  await adminApi.dispose();
});

test("host presenter view keeps navigation and submissions in modals", async ({ browser }) => {
  const session = await createHostAndPlayers(browser, competitionId, "Presenter Team One", "Presenter Team Two");

  try {
    await moveToQuestionPreview(session.hostPage);

    await expect(session.hostPage.getByTestId("host-presenter-question")).toContainText("Presenter question one");
    await expect(session.hostPage.getByTestId("host-next-action")).toBeVisible();
    await expect(session.hostPage.getByTestId("host-timer")).toHaveText("15s");

    await session.hostPage.getByTestId("host-next-action").click();
    await session.hostPage.getByTestId("host-next-action").click();
    await session.hostPage.getByTestId("host-next-action").click();

    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("QUESTION_ACTIVE");
    await expect(session.hostPage.getByTestId("host-presenter-answer-content")).toContainText("Alpha");
    await expect(session.hostPage.getByTestId("host-presenter-answer-content")).toContainText("Beta");

    await session.playerOnePage.getByTestId(/player-choice-/).first().click();
    await session.playerOnePage.getByTestId("player-submit-answer").click();
    await session.playerTwoPage.getByTestId(/player-choice-/).first().click();
    await session.playerTwoPage.getByTestId("player-submit-answer").click();

    await session.hostPage.getByTestId("host-next-action").click();
    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
      timeout: 20_000,
    });

    await session.hostPage.getByTestId("host-open-answers-modal").click();
    await expect(session.hostPage.getByTestId("host-answers-modal")).toBeVisible();
    await expect(session.hostPage.getByTestId("host-answers-modal")).toContainText("Presenter Team One");
    await expect(session.hostPage.getByTestId("host-answers-modal")).toContainText("Presenter Team Two");
    await session.hostPage.getByTestId("host-close-answers-modal").click();

    await expect(session.hostPage.getByTestId("host-open-answers-modal")).toBeVisible();
  } finally {
    await session.close();
  }
});

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
let questionIds: string[] = [];

test.beforeAll(async () => {
  adminApi = await createAdminApi();

  const fixture = await createCompetitionWithQuestions(adminApi, "E2E Host Presenter", [
    {
      questionText: "Presenter question one",
      type: "MULTIPLE_CHOICE",
      content: {
        options: ["Alpha", "Beta"],
        correctIndices: [0],
      },
    },
    {
      questionText: "Presenter question two",
      type: "MULTIPLE_CHOICE",
      content: {
        options: ["Noah", "Moses"],
        correctIndices: [0],
      },
    },
  ]);

  competitionId = fixture.competitionId;
  questionIds = fixture.questionIds;
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
    await expect(session.hostPage.getByTestId("host-timer")).toHaveText("0s");

    await session.hostPage.getByTestId("host-open-question-picker").click();
    await expect(session.hostPage.getByTestId("host-question-picker-modal")).toBeVisible();
    await session.hostPage.getByTestId(`host-question-option-${questionIds[1]}`).click();
    await expect(session.hostPage.getByTestId("host-presenter-question")).toContainText("Presenter question two");

    await session.hostPage.getByTestId("host-next-action").click();
    await session.hostPage.getByTestId("host-next-action").click();
    await session.hostPage.getByTestId("host-next-action").click();

    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("QUESTION_ACTIVE");
    await expect(session.hostPage.getByTestId("host-presenter-answer-content")).toContainText("Noah");
    await expect(session.hostPage.getByTestId("host-presenter-answer-content")).toContainText("Moses");

    await session.playerOnePage.getByTestId("player-choice-0").click();
    await session.playerOnePage.getByTestId("player-submit-answer").click();
    await session.playerTwoPage.getByTestId("player-choice-1").click();
    await session.playerTwoPage.getByTestId("player-submit-answer").click();

    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
      timeout: 20_000,
    });

    await session.hostPage.getByTestId("host-open-answers-modal").click();
    await expect(session.hostPage.getByTestId("host-answers-modal")).toBeVisible();
    await expect(session.hostPage.getByTestId("host-answers-modal")).toContainText("Presenter Team One");
    await expect(session.hostPage.getByTestId("host-answers-modal")).toContainText("Presenter Team Two");
    await session.hostPage.getByTestId("host-close-answers-modal").click();

    await session.hostPage.getByTestId("host-next-action").click();
    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("REVEAL_ANSWER", {
      timeout: 20_000,
    });
    await expect(session.hostPage.getByTestId("host-correct-answer-panel")).toBeVisible();
  } finally {
    await session.close();
  }
});

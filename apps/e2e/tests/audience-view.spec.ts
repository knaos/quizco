import { expect, test } from "@playwright/test";
import {
  clickHostNextAndExpectPhase,
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  moveToQuestionPreview,
} from "./helpers/gameHarness";

let competitionId = "";

test.beforeAll(async () => {
  const adminApi = await createAdminApi();
  const fixture = await createCompetitionWithQuestions(adminApi, "Audience View", [
    {
      questionText: "Audience multiple choice question",
      type: "MULTIPLE_CHOICE",
      content: {
        options: ["Wrong answer", "Correct answer"],
        correctIndices: [1],
      },
    },
    {
      questionText: "Audience crossword question",
      type: "CROSSWORD",
      content: {
        grid: [["A", "B"], ["", "C"]],
        clues: {
          across: [
            {
              number: 1,
              x: 0,
              y: 0,
              direction: "across",
              clue: "Audience across clue",
              answer: "AB",
            },
          ],
          down: [
            {
              number: 2,
              x: 1,
              y: 0,
              direction: "down",
              clue: "Audience down clue",
              answer: "BC",
            },
          ],
        },
      },
    },
  ]);
  competitionId = fixture.competitionId;
  await adminApi.dispose();
});

test.afterAll(async () => {
  if (!competitionId) {
    return;
  }

  const adminApi = await createAdminApi();
  await deleteCompetition(adminApi, competitionId);
  await adminApi.dispose();
});

test("audience view mirrors public question flow and reveal stats", async ({ browser }) => {
  const sessions = await createHostAndPlayers(
    browser,
    competitionId,
    "Audience Team One",
    "Audience Team Two",
  );

  const audienceContext = await browser.newContext();
  const audiencePage = await audienceContext.newPage();

  await audiencePage.goto("/audience");
  await audiencePage.getByTestId(`competition-option-${competitionId}`).click();
  await expect(audiencePage).toHaveURL(new RegExp(`\\/audience\\?competitionId=${competitionId}$`));
  await expect(audiencePage.getByTestId("audience-phase")).toHaveText("WAITING");

  const deepLinkedAudienceContext = await browser.newContext();
  const deepLinkedAudiencePage = await deepLinkedAudienceContext.newPage();
  await deepLinkedAudiencePage.goto(`/audience?competitionId=${competitionId}`);
  await expect(deepLinkedAudiencePage.getByTestId("audience-phase")).toHaveText("WAITING");
  await deepLinkedAudienceContext.close();

  await moveToQuestionPreview(sessions.hostPage);

  await expect(audiencePage.getByTestId("audience-phase")).toHaveText("QUESTION_PREVIEW", {
    timeout: 20_000,
  });

  await clickHostNextAndExpectPhase(sessions.hostPage, "QUESTION_PREVIEW");
  await expect(audiencePage.getByTestId("audience-preview-option-0")).toContainText("Wrong answer");
  await expect(audiencePage.getByTestId("audience-preview-option-1")).toHaveCount(0);

  await clickHostNextAndExpectPhase(sessions.hostPage, "QUESTION_PREVIEW");
  await expect(audiencePage.getByTestId("audience-preview-option-1")).toContainText("Correct answer");

  await clickHostNextAndExpectPhase(sessions.hostPage, "QUESTION_ACTIVE");
  await expect(audiencePage.getByTestId("audience-phase")).toHaveText("QUESTION_ACTIVE", {
    timeout: 20_000,
  });
  await expect(audiencePage.getByTestId("audience-choice-0")).toContainText("Wrong answer");
  await expect(audiencePage.getByTestId("audience-choice-1")).toContainText("Correct answer");
  await expect(audiencePage.getByTestId("player-submit-answer")).toHaveCount(0);

  await sessions.playerOnePage.getByTestId("player-choice-1").click();
  await sessions.playerOnePage.getByTestId("player-submit-answer").click();
  await sessions.playerTwoPage.getByTestId("player-choice-0").click();
  await sessions.playerTwoPage.getByTestId("player-submit-answer").click();

  await expect(sessions.hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
    timeout: 20_000,
  });

  await clickHostNextAndExpectPhase(sessions.hostPage, "REVEAL_ANSWER");

  await expect(audiencePage.getByTestId("audience-phase")).toHaveText("REVEAL_ANSWER", {
    timeout: 20_000,
  });
  await expect(audiencePage.getByTestId("audience-answer-stats")).toContainText(
    "1/2 teams correct (50%)",
  );
  await expect(audiencePage.getByText("Your Choice")).toHaveCount(0);
  await expect(audiencePage.locator("text=Correct answer")).toBeVisible();

  await clickHostNextAndExpectPhase(sessions.hostPage, "QUESTION_PREVIEW");
  await expect(audiencePage.getByTestId("audience-phase")).toHaveText("QUESTION_PREVIEW", {
    timeout: 20_000,
  });

  await clickHostNextAndExpectPhase(sessions.hostPage, "QUESTION_ACTIVE");

  await expect(audiencePage.getByTestId("audience-phase")).toHaveText("QUESTION_ACTIVE", {
    timeout: 20_000,
  });
  await expect(audiencePage.getByTestId("audience-active-question-text")).toHaveText(
    "Audience crossword question",
  );
  await expect(audiencePage.getByTestId("audience-crossword")).toBeVisible();
  await expect(audiencePage.getByTestId("audience-crossword-across-0")).toContainText(
    "Audience across clue",
  );
  await expect(audiencePage.getByTestId("audience-crossword-down-0")).toContainText(
    "Audience down clue",
  );
  await expect(audiencePage.getByTestId("crossword-submit")).toHaveCount(0);

  await audienceContext.close();
  await sessions.close();
});

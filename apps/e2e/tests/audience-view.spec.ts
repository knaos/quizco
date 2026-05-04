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
      source: "Йоан 3:16",
      timeLimitSeconds: 15,
      type: "MULTIPLE_CHOICE",
      content: {
        options: ["Wrong answer", "Correct answer"],
        correctIndices: [1],
      },
    },
    {
      questionText: "Audience crossword question",
      timeLimitSeconds: 15,
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

  const previewGrid = audiencePage.getByTestId("audience-preview-options-grid");

  await clickHostNextAndExpectPhase(sessions.hostPage, "QUESTION_PREVIEW");
  const previewHeightBeforeSecondReveal = await previewGrid.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await expect(previewGrid).toContainText(/Wrong answer|Correct answer/);
  await expect(audiencePage.getByTestId("audience-preview-option-1")).toHaveAttribute(
    "data-revealed",
    "false",
  );

  await clickHostNextAndExpectPhase(sessions.hostPage, "QUESTION_PREVIEW");
  const previewHeightAfterSecondReveal = await previewGrid.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await expect(previewGrid).toContainText("Correct answer");
  await expect(previewGrid).toContainText("Wrong answer");
  expect(Math.abs(previewHeightAfterSecondReveal - previewHeightBeforeSecondReveal)).toBeLessThan(
    1,
  );

  await clickHostNextAndExpectPhase(sessions.hostPage, "QUESTION_ACTIVE");
  await expect(audiencePage.getByTestId("audience-phase")).toHaveText("QUESTION_ACTIVE", {
    timeout: 20_000,
  });
  await expect(audiencePage.getByTestId(/audience-choice-/).filter({ hasText: "Wrong answer" })).toBeVisible();
  await expect(audiencePage.getByTestId(/audience-choice-/).filter({ hasText: "Correct answer" })).toBeVisible();
  await expect(audiencePage.getByTestId("player-submit-answer")).toHaveCount(0);

  await sessions.playerOnePage.getByTestId(/player-choice-/).filter({ hasText: "Correct answer" }).click();
  await sessions.playerOnePage.getByTestId("player-submit-answer").click();
  await sessions.playerTwoPage.getByTestId(/player-choice-/).filter({ hasText: "Wrong answer" }).click();
  await sessions.playerTwoPage.getByTestId("player-submit-answer").click();

  await clickHostNextAndExpectPhase(sessions.hostPage, "GRADING");

  await expect(audiencePage.getByTestId("audience-phase")).toHaveText("GRADING", {
    timeout: 20_000,
  });

  await audienceContext.close();
  await sessions.close();
});

import { test, expect } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  moveToQuestionPreview,
  clickHostNextAndExpectPhase,
} from "../helpers/gameHarness";

test("QUESTION_PREVIEW phase for CORRECT_THE_ERROR shows disabled word buttons without alternatives", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    // Create a competition with a CORRECT_THE_ERROR question
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E CTE Preview",
      [
        {
          questionText: "Find the error in the sentence",
          type: "CORRECT_THE_ERROR",
          content: {
            text: "The sky is green",
            words: [
              { wordIndex: 1, text: "sky", alternatives: ["sea", "land"] },
              { wordIndex: 3, text: "green", alternatives: ["blue", "black"] },
            ],
            errorWordIndex: 3,
            correctReplacement: "blue",
          },
        },
      ],
    );
    competitionId = fixture.competitionId;

    // Set up host and players
    session = await createHostAndPlayers(browser, competitionId, "Team One", "Team Two");

    // Move to QUESTION_PREVIEW phase
    await moveToQuestionPreview(session.hostPage);

    // Verify host is in QUESTION_PREVIEW phase
    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("QUESTION_PREVIEW");

    // Verify players are in QUESTION_PREVIEW phase
    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_PREVIEW");
    await expect(session.playerTwoPage.getByTestId("player-phase")).toHaveText("QUESTION_PREVIEW");

    // Verify the question text is displayed
    await expect(session.playerOnePage.getByText("Find the error in the sentence")).toBeVisible();

    // Verify word buttons are visible (there should be 4 words)
    await expect(session.playerOnePage.getByTestId("cte-word-0")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("cte-word-0")).toHaveText("The");
    await expect(session.playerOnePage.getByTestId("cte-word-1")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("cte-word-1")).toHaveText("sky");
    await expect(session.playerOnePage.getByTestId("cte-word-2")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("cte-word-2")).toHaveText("is");
    await expect(session.playerOnePage.getByTestId("cte-word-3")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("cte-word-3")).toHaveText("green");

    // Verify word buttons are disabled in preview mode (words with alternatives should still be disabled)
    const wordButton0 = session.playerOnePage.getByTestId("cte-word-0");
    await expect(wordButton0).toBeDisabled();

    const wordButton1 = session.playerOnePage.getByTestId("cte-word-1");
    await expect(wordButton1).toBeDisabled();

    const wordButton3 = session.playerOnePage.getByTestId("cte-word-3");
    await expect(wordButton3).toBeDisabled();

    // Verify alternatives/correction options are NOT visible in preview mode
    const alternative0 = session.playerOnePage.getByTestId("cte-alternative-0");
    await expect(alternative0).not.toBeVisible();

    // Verify the "host is reading" message is shown
    await expect(session.playerOnePage.getByText(/host.*reading/i)).toBeVisible();

    // Verify NO timer is displayed (should not see time remaining in preview)
    const timeRemaining = session.playerOnePage.getByTestId("player-time-remaining");
    await expect(timeRemaining).not.toBeVisible();

    // Verify NO submit button is shown in preview phase
    const submitButton = session.playerOnePage.getByTestId("player-submit-answer");
    await expect(submitButton).not.toBeVisible();

    // Now move to QUESTION_ACTIVE and verify the full interactive UI appears
    await clickHostNextAndExpectPhase(session.hostPage, "QUESTION_ACTIVE");

    // Verify players are now in QUESTION_ACTIVE
    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE");

    // Verify word buttons are now enabled (not disabled)
    const activeWordButton0 = session.playerOnePage.getByTestId("cte-word-0");
    await expect(activeWordButton0).toBeEnabled();

    const activeWordButton1 = session.playerOnePage.getByTestId("cte-word-1");
    await expect(activeWordButton1).toBeEnabled();

    // Verify submit button is now visible
    const activeSubmitButton = session.playerOnePage.getByTestId("player-submit-answer");
    await expect(activeSubmitButton).toBeVisible();

    // Test interaction: click a word with alternatives and verify alternatives appear
    await activeWordButton1.click();
    
    // Now alternatives should be visible
    const activeAlternative0 = session.playerOnePage.getByTestId("cte-alternative-0");
    await expect(activeAlternative0).toBeVisible();
    await expect(activeAlternative0).toHaveText("sea");

    const activeAlternative1 = session.playerOnePage.getByTestId("cte-alternative-1");
    await expect(activeAlternative1).toBeVisible();
    await expect(activeAlternative1).toHaveText("land");
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

import { test, expect } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  moveToQuestionPreview,
} from "../helpers/gameHarness";

test("QUESTION_PREVIEW phase for FILL_IN_THE_BLANKS shows placeholder dots", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    // Create a competition with a FILL_IN_THE_BLANKS question
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E FillBlanks Preview",
      [
        {
          questionText: "God {0} the world",
          type: "FILL_IN_THE_BLANKS",
          content: {
            text: "God {0} the world",
            blanks: [
              {
                options: [
                  { value: "loves", isCorrect: true },
                  { value: "hates", isCorrect: false },
                ],
              },
            ],
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
    await expect(session.playerOnePage.getByText("God {0} the world")).toBeVisible();

    // Verify placeholder dots are shown for blanks (not dropdowns)
    // The preview mode should show "..." instead of dropdown select elements
    const placeholderBlank = session.playerOnePage.getByTestId("fill-blank-preview-0");
    await expect(placeholderBlank).toBeVisible();
    await expect(placeholderBlank).toHaveText("...");

    // Verify the "host is reading" message is shown
    await expect(session.playerOnePage.getByText(/host.*reading/i)).toBeVisible();

    // Verify NO timer is displayed (should not see time remaining in preview)
    const timeRemaining = session.playerOnePage.getByTestId("player-time-remaining");
    await expect(timeRemaining).not.toBeVisible();

    // Verify NO submit button is shown in preview phase
    const submitButton = session.playerOnePage.getByTestId("player-submit-answer");
    await expect(submitButton).not.toBeVisible();

    // Now move to QUESTION_ACTIVE and verify dropdowns appear
    await session.hostPage.getByTestId("host-next-action").click();
    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("QUESTION_ACTIVE");

    // Verify players are now in QUESTION_ACTIVE
    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE");

    // Verify dropdown select is now visible (not the preview placeholder)
    const dropdownSelect = session.playerOnePage.getByTestId("fill-blank-0");
    await expect(dropdownSelect).toBeVisible();

    // Verify submit button is now visible
    await expect(session.playerOnePage.getByTestId("player-submit-answer")).toBeVisible();
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

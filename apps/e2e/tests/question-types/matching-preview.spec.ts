import { test, expect } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  moveToQuestionPreview,
} from "../helpers/gameHarness";

test("QUESTION_PREVIEW phase for MATCHING shows non-interactive matching UI", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    // Create a competition with a MATCHING question
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Matching Preview",
      [
        {
          questionText: "Match the items",
          type: "MATCHING",
          content: {
            pairs: [
              { id: "m1", left: "Apple", right: "Fruit" },
              { id: "m2", left: "Carrot", right: "Vegetable" },
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

    // Verify the question text is displayed
    await expect(session.playerOnePage.getByText("Match the items")).toBeVisible();

    // Verify matching cards are visible (both left and right columns)
    await expect(session.playerOnePage.getByTestId("matching-left-m1")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("matching-left-m2")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("matching-right-0")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("matching-right-1")).toBeVisible();

    // Verify the "host is reading" message is shown
    await expect(session.playerOnePage.getByText(/host.*reading/i)).toBeVisible();

    // Verify NO timer is displayed (should not see time remaining in preview)
    const timeRemaining = session.playerOnePage.getByTestId("player-time-remaining");
    await expect(timeRemaining).not.toBeVisible();

    // Verify NO submit button is shown in preview phase
    const submitButton = session.playerOnePage.getByTestId("player-submit-answer");
    await expect(submitButton).not.toBeVisible();

    // Now move to QUESTION_ACTIVE and verify matching becomes interactive
    await session.hostPage.getByTestId("host-next-action").click();
    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("QUESTION_ACTIVE");

    // Verify players are now in QUESTION_ACTIVE
    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE");

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

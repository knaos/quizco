import { expect, test } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  moveToQuestionPreview,
} from "../helpers/gameHarness";

test("QUESTION_PREVIEW phase for CHRONOLOGY shows items in pool for host to read", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    // Create a competition with a CHRONOLOGY question
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Chronology Preview",
      [
        {
          questionText: "Order these events chronologically",
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

    // Set up host and players
    session = await createHostAndPlayers(browser, competitionId, "Team One", "Team Two");

    // Move to QUESTION_PREVIEW phase
    await moveToQuestionPreview(session.hostPage);

    // Verify host is in QUESTION_PREVIEW phase
    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("QUESTION_PREVIEW");

    // Verify players are in QUESTION_PREVIEW phase
    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_PREVIEW");

    // Verify the question text is displayed
    await expect(session.playerOnePage.getByText("Order these events chronologically")).toBeVisible();

    // Verify chronology items are visible in the pool (left column)
    await expect(session.playerOnePage.getByTestId("chronology-item-e1")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("chronology-item-e1")).toContainText("First Event");
    await expect(session.playerOnePage.getByTestId("chronology-item-e2")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("chronology-item-e2")).toContainText("Second Event");
    await expect(session.playerOnePage.getByTestId("chronology-item-e3")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("chronology-item-e3")).toContainText("Third Event");

    // Verify empty slots are visible in timeline (right column)
    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("chronology-slot-1")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("chronology-slot-2")).toBeVisible();

    // Verify the host-reading hint is shown.
    await expect(session.playerOnePage.getByTestId("player-host-reading-message")).toBeVisible();

    // Verify NO submit button is shown in preview phase
    const submitButton = session.playerOnePage.getByTestId("player-submit-answer");
    await expect(submitButton).not.toBeVisible();
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

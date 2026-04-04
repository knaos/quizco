import { expect, test } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  moveToQuestionPreview,
} from "../helpers/gameHarness";

test("QUESTION_PREVIEW phase for CROSSWORD shows grid without input", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    // Create a competition with a CROSSWORD question
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Crossword Preview",
      [
        {
          questionText: "Solve the crossword puzzle",
          type: "CROSSWORD",
          content: {
            grid: [
              ["", "", "", "", ""],
              ["", "T", "E", "S", "T"],
              ["", "", "A", "", ""],
              ["", "", "P", "", ""],
              ["", "", "", "", ""],
            ],
            clues: {
              across: [
                { clue: "A sample", answer: "TEST", x: 1, y: 1, direction: "across", number: 1 },
                { clue: "Maple product", answer: "SAP", x: 2, y: 3, direction: "down", number: 2 },
              ],
              down: [
                { clue: "A sample", answer: "TEST", x: 1, y: 1, direction: "down", number: 1 },
                { clue: "Maple product", answer: "SAP", x: 2, y: 3, direction: "down", number: 2 },
              ],
            },
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
    await expect(session.playerOnePage.getByText("Solve the crossword puzzle")).toBeVisible();

    // Verify crossword grid is visible - cell 1-1 has "T" content
    await expect(session.playerOnePage.getByTestId("crossword-cell-1-1")).toBeVisible();

    // Verify clue sections are visible
    await expect(session.playerOnePage.getByText("Across")).toBeVisible();
    await expect(session.playerOnePage.getByText("Down")).toBeVisible();

    // Verify clues are visible (just the text) - use .first() as clues appear in both Across and Down
    await expect(session.playerOnePage.getByText(/A sample/).first()).toBeVisible();
    await expect(session.playerOnePage.getByText(/Maple product/).first()).toBeVisible();

    // Verify NO joker button is shown in preview
    const jokerButton = session.playerOnePage.getByText(/Request Joker/);
    await expect(jokerButton).not.toBeVisible();

    // Verify NO submit button is shown in preview phase
    const submitButton = session.playerOnePage.getByTestId("crossword-submit");
    await expect(submitButton).not.toBeVisible();

    // Verify the "host is reading" message is shown
    await expect(session.playerOnePage.getByText(/host.*reading/i)).toBeVisible();
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

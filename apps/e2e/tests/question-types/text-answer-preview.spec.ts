import { expect, test } from "@playwright/test";
import {
  clickHostNextAndExpectPhase,
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  moveToQuestionPreview,
} from "../helpers/gameHarness";

test("QUESTION_PREVIEW phase for CLOSED and OPEN_WORD shows disabled answer input", async ({
  browser,
}) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Text Answer Preview",
      [
        {
          questionText: "Closed preview question",
          type: "CLOSED",
          content: { options: ["Jerusalem"] },
        },
        {
          questionText: "Open preview question",
          type: "OPEN_WORD",
          content: { answer: "Faith" },
        },
      ],
    );
    competitionId = fixture.competitionId;

    session = await createHostAndPlayers(browser, competitionId, "Team One", "Team Two");

    await moveToQuestionPreview(session.hostPage);

    const previewInput = session.playerOnePage.getByTestId("player-preview-answer-input");
    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_PREVIEW");
    await expect(session.playerOnePage.getByText("Closed preview question")).toBeVisible();
    await expect(previewInput).toBeVisible();
    await expect(previewInput).toBeDisabled();
    await expect(session.playerOnePage.getByTestId("player-submit-answer")).not.toBeVisible();

    await clickHostNextAndExpectPhase(session.hostPage, "QUESTION_ACTIVE");
    await expect(session.playerOnePage.getByTestId("player-open-answer-input")).toBeVisible();
    await expect(session.playerOnePage.getByTestId("player-submit-answer")).toBeVisible();

    await session.playerOnePage.getByTestId("player-open-answer-input").fill("Jerusalem");
    await session.playerOnePage.getByTestId("player-submit-answer").click();
    await session.playerTwoPage.getByTestId("player-open-answer-input").fill("Wrong");
    await session.playerTwoPage.getByTestId("player-submit-answer").click();
    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
      timeout: 20_000,
    });

    await clickHostNextAndExpectPhase(session.hostPage, "REVEAL_ANSWER");
    await clickHostNextAndExpectPhase(session.hostPage, "QUESTION_PREVIEW");

    const secondPreviewInput = session.playerOnePage.getByTestId("player-preview-answer-input");
    await expect(session.playerOnePage.getByText("Open preview question")).toBeVisible();
    await expect(secondPreviewInput).toBeVisible();
    await expect(secondPreviewInput).toBeDisabled();
    await expect(session.playerOnePage.getByTestId("player-submit-answer")).not.toBeVisible();
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

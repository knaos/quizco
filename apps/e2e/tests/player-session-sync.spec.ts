import { expect, test } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  movePreviewToActive,
  moveToQuestionPreview,
} from "./helpers/gameHarness";

test("player join reaches waiting and active phases reliably", async ({ browser }) => {
  const adminApi = await createAdminApi();
  const fixture = await createCompetitionWithQuestions(adminApi, "Player session sync", [
    {
      questionText: "Player sync question",
      type: "OPEN_WORD",
      timeLimitSeconds: 10,
      content: { answer: "Faith" },
    },
  ]);

  const session = await createHostAndPlayers(
    browser,
    fixture.competitionId,
    "Sync Team One",
    "Sync Team Two",
  );

  try {
    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("WAITING", {
      timeout: 20_000,
    });
    await expect(session.playerTwoPage.getByTestId("player-phase")).toHaveText("WAITING", {
      timeout: 20_000,
    });

    await moveToQuestionPreview(session.hostPage);
    await movePreviewToActive(session.hostPage, "OPEN_WORD");

    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
      timeout: 20_000,
    });
    await expect(session.playerTwoPage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
      timeout: 20_000,
    });
  } finally {
    await session.close();
    await deleteCompetition(adminApi, fixture.competitionId);
    await adminApi.dispose();
  }
});

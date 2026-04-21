import { expect, test } from "@playwright/test";
import {
  HOST_PASSWORD,
  clickHostNextAndExpectPhase,
  createAdminApi,
  createCompetitionWithQuestions,
  deleteCompetition,
  movePreviewToActive,
  moveToQuestionPreview,
} from "./helpers/gameHarness";

test.setTimeout(60_000);

test("player final answer is replayed after reconnect and still recorded", async ({ browser }) => {
  const adminApi = await createAdminApi();
  const fixture = await createCompetitionWithQuestions(adminApi, "Reconnect answer", [
    {
      questionText: "Open reconnect question",
      type: "OPEN_WORD",
      timeLimitSeconds: 5,
      content: { answer: "Faith" },
    },
  ]);

  const hostContext = await browser.newContext();
  const playerContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const playerPage = await playerContext.newPage();

  try {
    await hostPage.goto("/host");
    await hostPage.getByTestId("host-password-input").fill(HOST_PASSWORD);
    await hostPage.getByTestId("host-login-submit").click();
    await hostPage.getByTestId(`host-competition-option-${fixture.competitionId}`).click();
    await expect(hostPage.getByTestId("host-current-phase")).toHaveText("WAITING");

    await playerPage.goto("/play");
    await playerPage.getByTestId(`competition-option-${fixture.competitionId}`).click();
    await playerPage.getByTestId("team-name-input").fill("Reconnect Team One");
    await playerPage.getByTestId("join-team-submit").click();
    await expect(hostPage.getByTestId("host-team-count")).toContainText("1", {
      timeout: 20_000,
    });

    await moveToQuestionPreview(hostPage);
    await movePreviewToActive(hostPage, "OPEN_WORD");

    await expect(playerPage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
      timeout: 20_000,
    });

    await playerContext.setOffline(true);
    await playerPage.getByTestId("player-open-answer-input").fill("Faith");
    await playerPage.getByTestId("player-submit-answer").click();
    await playerContext.setOffline(false);

    await expect(hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
      timeout: 20_000,
    });

    await clickHostNextAndExpectPhase(hostPage, "REVEAL_ANSWER");
    await expect(playerPage.getByText("Score: 1")).toBeVisible({
      timeout: 20_000,
    });
  } finally {
    await hostContext.close();
    await playerContext.close();
    await deleteCompetition(adminApi, fixture.competitionId);
    await adminApi.dispose();
  }
});

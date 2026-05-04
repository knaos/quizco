import { expect, test } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  movePreviewToActive,
  moveToQuestionPreview,
} from "./helpers/gameHarness";

test("admin teams monitor shows history and guarded score adjustment", async ({ browser, page }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(adminApi, "Teams Monitor", [
      {
        questionText: "Type faith",
        type: "OPEN_WORD",
        points: 5,
        grading: "AUTO",
        content: { answer: "faith" },
      },
    ]);

    competitionId = fixture.competitionId;
    session = await createHostAndPlayers(browser, competitionId, "Team One", "Team Two");

    await moveToQuestionPreview(session.hostPage);
    await movePreviewToActive(session.hostPage, "OPEN_WORD");

    await session.playerOnePage.getByTestId("player-open-answer-input").fill("faith");
    await session.playerOnePage.getByTestId("player-submit-answer").click();

    await page.goto("/admin");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('form button[type="submit"]').click();

    await page.getByTestId("admin-nav-teams").click();
    await page.getByTestId("admin-teams-competition-select").selectOption(competitionId);

    const teamsResponse = await adminApi.get(`/api/admin/competitions/${competitionId}/teams`);
    const teams = (await teamsResponse.json()) as { teams: Array<{ id: string; name: string }> };
    const teamOne = teams.teams.find((team) => team.name === "Team One");
    expect(teamOne).toBeDefined();

    await page.getByTestId(`admin-teams-list-item-${teamOne!.id}`).click();
    await expect(page.getByTestId(/admin-team-answer-row-/).first()).toBeVisible();

    await page.getByTestId(/admin-team-answer-history-/).first().click();
    await expect(page.getByTestId("admin-team-history-modal")).toBeVisible();
    await page.getByTestId("admin-team-history-close").click();

    await page.getByTestId(/admin-team-answer-adjust-/).first().click();
    await expect(page.getByTestId("admin-team-adjust-confirm-step")).toBeDisabled();

    await page.getByTestId("admin-team-adjust-score-input").fill("2");
    await page.getByTestId("admin-team-adjust-reason-input").fill("manual correction");

    await expect(page.getByTestId("admin-team-adjust-confirm-step")).toBeEnabled();
    await page.getByTestId("admin-team-adjust-confirm-step").click();
    await page.getByTestId("admin-team-adjust-submit").click();
    await expect(page.getByTestId("admin-team-adjust-success")).toBeVisible();
  } finally {
    if (session) {
      await session.close();
    }
    if (competitionId) {
      await deleteCompetition(adminApi, competitionId);
    }
    await adminApi.dispose();
  }
});

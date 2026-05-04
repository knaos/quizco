import { expect, test } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  movePreviewToActive,
  moveToQuestionPreview,
} from "./helpers/gameHarness";

test("admin answer history tracks snapshots and score correction updates leaderboard", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(adminApi, "Admin History", [
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
    await session.playerTwoPage.getByTestId("player-open-answer-input").fill("wrong");
    await session.playerTwoPage.getByTestId("player-submit-answer").click();

    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("GRADING");

    const historyResponse = await adminApi.get(`/api/admin/competitions/${competitionId}/answer-history`);
    expect(historyResponse.ok()).toBeTruthy();
    const historyData = await historyResponse.json() as {
      records: Array<{
        answerId: string;
        teamName: string;
        latestScoreAwarded: number;
        snapshots: Array<{ snapshotType: string }>;
      }>;
    };

    expect(historyData.records.length).toBeGreaterThanOrEqual(2);

    const teamOneRecord = historyData.records.find((record) => record.teamName === "Team One");
    expect(teamOneRecord).toBeDefined();
    expect(teamOneRecord?.snapshots.some((snapshot) => snapshot.snapshotType === "SUBMISSION_UPDATE")).toBe(true);

    const patchResponse = await adminApi.patch(`/api/admin/answers/${teamOneRecord!.answerId}/score`, {
      data: {
        competitionId,
        scoreAwarded: 2,
      },
    });
    expect(patchResponse.ok()).toBeTruthy();

    await expect(session.hostPage.getByTestId("host-leaderboard-summary")).toContainText("Team One");
    await expect(session.hostPage.getByTestId("host-leaderboard-summary")).toContainText("2");

    const historyAfterResponse = await adminApi.get(`/api/admin/competitions/${competitionId}/answer-history`);
    expect(historyAfterResponse.ok()).toBeTruthy();
    const historyAfter = await historyAfterResponse.json() as {
      records: Array<{
        teamName: string;
        latestScoreAwarded: number;
        snapshots: Array<{ snapshotType: string }>;
      }>;
    };

    const teamOneAfter = historyAfter.records.find((record) => record.teamName === "Team One");
    expect(teamOneAfter?.latestScoreAwarded).toBe(2);
    expect(teamOneAfter?.snapshots.some((snapshot) => snapshot.snapshotType === "SCORE_ADJUSTMENT")).toBe(true);
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

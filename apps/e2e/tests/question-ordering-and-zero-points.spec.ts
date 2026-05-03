import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  clickHostNextAndExpectPhase,
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  moveToQuestionPreview,
} from "./helpers/gameHarness";

test.describe("question ordering and zero-point grading", () => {
  let adminApi: APIRequestContext;

  test.beforeAll(async () => {
    adminApi = await createAdminApi();
  });

  test.afterAll(async () => {
    await adminApi.dispose();
  });

  test("admin question creation assigns numbering metadata and keeps section data", async () => {
    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createCompetitionRes = await adminApi.post("/api/admin/competitions", {
      data: { title: `Ordering ${uniqueSuffix}`, host_pin: "9999" },
    });
    expect(createCompetitionRes.ok()).toBeTruthy();
    const competition = (await createCompetitionRes.json()) as { id: string };

    try {
      const createRoundRes = await adminApi.post("/api/admin/rounds", {
        data: {
          competitionId: competition.id,
          title: "Round 1",
          type: "STANDARD",
          orderIndex: 1,
        },
      });
      expect(createRoundRes.ok()).toBeTruthy();
      const round = (await createRoundRes.json()) as { id: string };

      const firstQuestionRes = await adminApi.post("/api/admin/questions", {
        data: {
          roundId: round.id,
          questionText: "Section A example",
          type: "MULTIPLE_CHOICE",
          points: 0,
          timeLimitSeconds: 30,
          grading: "AUTO",
          section: "A",
          content: {
            options: ["Wrong", "Right"],
            correctIndices: [1],
          },
        },
      });
      if (!firstQuestionRes.ok()) {
        throw new Error(`first question failed: ${firstQuestionRes.status()} ${await firstQuestionRes.text()}`);
      }

      const secondQuestionRes = await adminApi.post("/api/admin/questions", {
        data: {
          roundId: round.id,
          questionText: "Section A real",
          type: "MULTIPLE_CHOICE",
          points: 1,
          timeLimitSeconds: 30,
          grading: "AUTO",
          section: "A",
          content: {
            options: ["Wrong", "Right"],
            correctIndices: [1],
          },
        },
      });
      if (!secondQuestionRes.ok()) {
        throw new Error(`second question failed: ${secondQuestionRes.status()} ${await secondQuestionRes.text()}`);
      }

      const listQuestionsRes = await adminApi.get(`/api/admin/rounds/${round.id}/questions`);
      expect(listQuestionsRes.ok()).toBeTruthy();
      const questions = (await listQuestionsRes.json()) as Array<{
        section: string | null;
        index: number | null;
        realIndex: number | null;
      }>;

      expect(questions).toHaveLength(2);
      expect(questions[0]).toMatchObject({ section: "A", index: 0, realIndex: 0 });
      expect(questions[1]).toMatchObject({ section: "A", index: 1, realIndex: 1 });
    } finally {
      await deleteCompetition(adminApi, competition.id);
    }
  });

  test("zero-point questions still reveal wrong answers as incorrect", async ({ browser }) => {
    const fixture = await createCompetitionWithQuestions(adminApi, "Zero Point Reveal", [
      {
        questionText: "Example question",
        type: "MULTIPLE_CHOICE",
        points: 0,
        content: {
          options: ["Wrong", "Right"],
          correctIndices: [1],
        },
      },
    ]);

    let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

    try {
      session = await createHostAndPlayers(
        browser,
        fixture.competitionId,
        "Zero Point Team One",
        "Zero Point Team Two",
      );

      await moveToQuestionPreview(session.hostPage);
      await clickHostNextAndExpectPhase(session.hostPage, "QUESTION_PREVIEW");
      await clickHostNextAndExpectPhase(session.hostPage, "QUESTION_PREVIEW");
      await clickHostNextAndExpectPhase(session.hostPage, "QUESTION_ACTIVE");

      await session.playerOnePage
        .locator('[data-testid^="player-choice-"]', { hasText: "Right" })
        .first()
        .click();
      await session.playerOnePage.getByTestId("player-submit-answer").click();

      await session.playerTwoPage
        .locator('[data-testid^="player-choice-"]', { hasText: "Wrong" })
        .first()
        .click();
      await session.playerTwoPage.getByTestId("player-submit-answer").click();

      await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
        timeout: 20_000,
      });

      await clickHostNextAndExpectPhase(session.hostPage, "REVEAL_ANSWER");

      await expect(
        session.playerOnePage.getByTestId("reveal-option-correct").first(),
      ).toBeVisible();
      await expect(
        session.playerTwoPage.getByTestId("reveal-option-incorrect-selected").first(),
      ).toBeVisible();
    } finally {
      if (session) {
        await session.close();
      }
      await deleteCompetition(adminApi, fixture.competitionId);
    }
  });
});

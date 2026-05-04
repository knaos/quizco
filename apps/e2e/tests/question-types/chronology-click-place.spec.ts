import { expect, test } from "@playwright/test";
import {
  createAdminApi,
  createCompetitionWithQuestions,
  createHostAndPlayers,
  deleteCompetition,
  movePreviewToActive,
  moveToQuestionPreview,
} from "../helpers/gameHarness";

test("Chronology supports click-to-place interaction", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Chronology Click Place",
      [
        {
          questionText: "Chronology click to place question",
          type: "CHRONOLOGY",
          content: {
            items: [
              { id: "c1", text: "First", order: 0 },
              { id: "c2", text: "Second", order: 1 },
            ],
          },
        },
      ],
    );
    competitionId = fixture.competitionId;

    session = await createHostAndPlayers(
      browser,
      competitionId,
      "Chronology Click Team One",
      "Chronology Click Team Two",
    );

    await moveToQuestionPreview(session.hostPage);
    await movePreviewToActive(session.hostPage, "CHRONOLOGY");

    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
      timeout: 20_000,
    });

    await session.playerOnePage.getByTestId("chronology-item-c1").click();
    const card = session.playerOnePage.getByTestId("chronology-item-c1");
    await expect(card).toHaveClass(/ring-4/);

    await session.playerOnePage.getByTestId("chronology-slot-0").click();
    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).toContainText("First");

    await session.playerOnePage.getByTestId("chronology-item-c2").click();
    await session.playerOnePage.getByTestId("chronology-slot-1").click();
    await expect(session.playerOnePage.getByTestId("chronology-slot-1")).toContainText("Second");

    await expect(
      session.playerOnePage
        .getByTestId("chronology-pool-dropzone")
        .getByTestId(/chronology-item-/),
    ).toHaveCount(0);

    await session.playerOnePage.getByTestId("player-submit-answer").click();
    await session.playerTwoPage.getByTestId("player-submit-answer").click();
    await expect(session.hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
      timeout: 20_000,
    });
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

test("Chronology click placement supports insertion separator between slots", async ({ browser }) => {
  const adminApi = await createAdminApi();
  let competitionId = "";
  let session: Awaited<ReturnType<typeof createHostAndPlayers>> | null = null;

  try {
    const fixture = await createCompetitionWithQuestions(
      adminApi,
      "E2E Chronology Click Insert Separator",
      [
        {
          questionText: "Chronology insertion separator question",
          type: "CHRONOLOGY",
          content: {
            items: [
              { id: "c1", text: "One", order: 0 },
              { id: "c2", text: "Two", order: 1 },
              { id: "c3", text: "Three", order: 2 },
            ],
          },
        },
      ],
    );
    competitionId = fixture.competitionId;

    session = await createHostAndPlayers(
      browser,
      competitionId,
      "Chronology Insert Separator Team One",
      "Chronology Insert Separator Team Two",
    );

    await moveToQuestionPreview(session.hostPage);
    await movePreviewToActive(session.hostPage, "CHRONOLOGY");

    await expect(session.playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
      timeout: 20_000,
    });

    await session.playerOnePage.getByTestId("chronology-item-c1").click();
    await session.playerOnePage.getByTestId("chronology-slot-0").click();
    await session.playerOnePage.getByTestId("chronology-item-c3").click();
    await session.playerOnePage.getByTestId("chronology-slot-1").click();

    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).toContainText("One");
    await expect(session.playerOnePage.getByTestId("chronology-slot-1")).toContainText("Three");

    await session.playerOnePage.getByTestId("chronology-item-c2").click();
    await session.playerOnePage.getByTestId("chronology-insert-1").click();

    await expect(session.playerOnePage.getByTestId("chronology-slot-0")).toContainText("One");
    await expect(session.playerOnePage.getByTestId("chronology-slot-1")).toContainText("Two");
    await expect(session.playerOnePage.getByTestId("chronology-slot-2")).toContainText("Three");
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

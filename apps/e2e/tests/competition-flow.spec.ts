import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createAdminApi } from "./helpers/gameHarness";
function readServerEnvValue(key: string): string | null {
  const envPath = path.resolve(process.cwd(), "../server/.env");
  if (!fs.existsSync(envPath)) {
    return null;
  }
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim() || null;
}

const HOST_PASSWORD =
  process.env.E2E_HOST_PASSWORD ??
  process.env.HOST_PASSWORD ??
  readServerEnvValue("HOST_PASSWORD") ??
  "host123";

let adminApi: APIRequestContext;
let competitionId = "";

async function createCompetitionFixture(api: APIRequestContext): Promise<string> {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const title = `E2E Full Competition ${uniqueSuffix}`;

  const createCompetitionRes = await api.post("/api/admin/competitions", {
    data: {
      title,
      host_pin: "9999",
    },
  });
  expect(createCompetitionRes.ok()).toBeTruthy();

  const competition = (await createCompetitionRes.json()) as { id: string };

  const activateCompetitionRes = await api.put(`/api/admin/competitions/${competition.id}`, {
    data: {
      title,
      host_pin: "9999",
      status: "ACTIVE",
    },
  });
  expect(activateCompetitionRes.ok()).toBeTruthy();

  const createRoundRes = await api.post("/api/admin/rounds", {
    data: {
      competitionId: competition.id,
      title: "Round 1",
      type: "STANDARD",
      orderIndex: 1,
    },
  });
  expect(createRoundRes.ok()).toBeTruthy();
  const round = (await createRoundRes.json()) as { id: string };

  const createQuestionRes = await api.post("/api/admin/questions", {
    data: {
      roundId: round.id,
      questionText: "E2E Multiple Choice Question",
      type: "MULTIPLE_CHOICE",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        options: ["Wrong answer", "Correct answer"],
        correctIndices: [1],
      },
    },
  });
  expect(createQuestionRes.ok()).toBeTruthy();

  return competition.id;
}

async function clickHostNextAndExpectPhase(hostPage: Page, expectedPhase: string): Promise<void> {
  await hostPage.getByTestId("host-next-action").click();
  await expect(hostPage.getByTestId("host-current-phase")).toHaveText(expectedPhase, {
    timeout: 20_000,
  });
}

test.beforeAll(async () => {
  adminApi = await createAdminApi();
  competitionId = await createCompetitionFixture(adminApi);
});

test.afterAll(async () => {
  if (competitionId) {
    await adminApi.delete(`/api/admin/competitions/${competitionId}`);
  }
  await adminApi.dispose();
});

test("host plus two players complete a full competition cycle", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const playerOneContext = await browser.newContext();
  const playerTwoContext = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const playerOnePage = await playerOneContext.newPage();
  const playerTwoPage = await playerTwoContext.newPage();

  await hostPage.goto("/host");
  await hostPage.getByTestId("host-password-input").fill(HOST_PASSWORD);
  await hostPage.getByTestId("host-login-submit").click();
  await expect(hostPage.getByTestId(`host-competition-option-${competitionId}`)).toBeVisible({
    timeout: 20_000,
  });
  await hostPage.getByTestId(`host-competition-option-${competitionId}`).click();
  await expect(hostPage.getByTestId("host-current-phase")).toHaveText("WAITING");

  await playerOnePage.goto("/play");
  await playerOnePage.getByTestId(`competition-option-${competitionId}`).click();
  await playerOnePage.getByTestId("team-name-input").fill("E2E Team One");
  await playerOnePage.getByTestId("join-team-submit").click();
  await expect(playerOnePage.getByTestId("player-phase")).toHaveText("WAITING");

  await playerTwoPage.goto("/play");
  await playerTwoPage.getByTestId(`competition-option-${competitionId}`).click();
  await playerTwoPage.getByTestId("team-name-input").fill("E2E Team Two");
  await playerTwoPage.getByTestId("join-team-submit").click();
  await expect(playerTwoPage.getByTestId("player-phase")).toHaveText("WAITING");

  await clickHostNextAndExpectPhase(hostPage, "WELCOME");
  await clickHostNextAndExpectPhase(hostPage, "ROUND_START");
  await clickHostNextAndExpectPhase(hostPage, "QUESTION_PREVIEW");

  // MULTIPLE_CHOICE reveal steps: reveal option 1 -> reveal option 2 -> start timer
  await clickHostNextAndExpectPhase(hostPage, "QUESTION_PREVIEW");
  await clickHostNextAndExpectPhase(hostPage, "QUESTION_PREVIEW");
  await clickHostNextAndExpectPhase(hostPage, "QUESTION_ACTIVE");

  await expect(playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
    timeout: 20_000,
  });
  await expect(playerTwoPage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
    timeout: 20_000,
  });

  await playerOnePage
    .locator('[data-testid^="player-choice-"]', { hasText: "Correct answer" })
    .first()
    .click();
  await playerOnePage.getByTestId("player-submit-answer").click();

  await playerTwoPage
    .locator('[data-testid^="player-choice-"]', { hasText: "Wrong answer" })
    .first()
    .click();
  await playerTwoPage.getByTestId("player-submit-answer").click();

  await expect(hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
    timeout: 20_000,
  });
  await expect(playerOnePage.getByTestId("player-phase")).toHaveText("GRADING", {
    timeout: 20_000,
  });
  await expect(playerTwoPage.getByTestId("player-phase")).toHaveText("GRADING", {
    timeout: 20_000,
  });

  await clickHostNextAndExpectPhase(hostPage, "REVEAL_ANSWER");
  await clickHostNextAndExpectPhase(hostPage, "ROUND_END");
  await clickHostNextAndExpectPhase(hostPage, "LEADERBOARD");

  await expect(playerOnePage.getByTestId("player-leaderboard")).toBeVisible({
    timeout: 20_000,
  });
  await expect(playerOnePage.getByTestId("leaderboard-team-E2E Team One")).toBeVisible();
  await expect(playerOnePage.getByTestId("leaderboard-team-E2E Team Two")).toBeVisible();

  const rows = playerOnePage.getByTestId(/leaderboard-team-/);
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("E2E Team One");

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

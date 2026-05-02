import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { io } from "socket.io-client";
import { createAdminApi } from "./helpers/gameHarness";

interface CompetitionFixture {
  id: string;
  questionId: string;
}

interface QuestionConfig {
  grading: "AUTO" | "MANUAL";
  timeLimitSeconds: number;
}

interface PendingAnswer {
  id: string;
  team_name?: string;
}

async function createHostSocketToken(api: APIRequestContext): Promise<string> {
  const loginRes = await api.post("/api/auth/login", {
    data: {
      role: "host",
      password: HOST_PASSWORD,
    },
  });
  expect(loginRes.ok()).toBeTruthy();
  const body = (await loginRes.json()) as { token: string };
  return body.token;
}

async function createOpenWordCompetition(
  api: APIRequestContext,
  config: QuestionConfig,
): Promise<CompetitionFixture> {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const title = `E2E Agentic Debug ${uniqueSuffix}`;

  const createCompetitionRes = await api.post("/api/admin/competitions", {
    data: { title, host_pin: "9999" },
  });
  expect(createCompetitionRes.ok()).toBeTruthy();
  const competition = (await createCompetitionRes.json()) as { id: string };

  const activateCompetitionRes = await api.put(`/api/admin/competitions/${competition.id}`, {
    data: { title, host_pin: "9999", status: "ACTIVE" },
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
      questionText: "Agentic debug open word question",
      type: "OPEN_WORD",
      points: 10,
      timeLimitSeconds: config.timeLimitSeconds,
      grading: config.grading,
      content: {
        answer: "Jerusalem",
      },
    },
  });
  expect(createQuestionRes.ok()).toBeTruthy();
  const question = (await createQuestionRes.json()) as { id: string };

  return { id: competition.id, questionId: question.id };
}

async function loginHostAndSelectCompetition(hostPage: Page, competitionId: string): Promise<void> {
  await hostPage.goto("/host");
  await hostPage.getByTestId("host-password-input").fill(HOST_PASSWORD);
  await hostPage.getByTestId("host-login-submit").click();
  await expect(hostPage.getByTestId(`host-competition-option-${competitionId}`)).toBeVisible({
    timeout: 20_000,
  });
  await hostPage.getByTestId(`host-competition-option-${competitionId}`).click();
  await expect(hostPage.getByTestId("host-current-phase")).toHaveText("WAITING");
}

async function joinPlayer(playerPage: Page, competitionId: string, teamName: string): Promise<void> {
  await playerPage.goto("/play");
  await playerPage.getByTestId(`competition-option-${competitionId}`).click();
  await playerPage.getByTestId("team-name-input").fill(teamName);
  await playerPage.getByTestId("join-team-submit").click();
  await expect(playerPage.getByTestId("player-phase")).toHaveText("WAITING");
}

async function clickHostNextAndExpectPhase(hostPage: Page, expectedPhase: string): Promise<void> {
  await hostPage.getByTestId("host-next-action").click();
  await expect(hostPage.getByTestId("host-current-phase")).toHaveText(expectedPhase, {
    timeout: 20_000,
  });
}

async function moveToQuestionActive(hostPage: Page): Promise<void> {
  await clickHostNextAndExpectPhase(hostPage, "WELCOME");
  await clickHostNextAndExpectPhase(hostPage, "ROUND_START");
  await clickHostNextAndExpectPhase(hostPage, "QUESTION_PREVIEW");
  await clickHostNextAndExpectPhase(hostPage, "QUESTION_ACTIVE");
}

function parseRemainingSeconds(raw: string): number {
  const match = raw.match(/(\d+)s/);
  if (!match) {
    throw new Error(`Unable to parse time remaining value: ${raw}`);
  }
  return Number(match[1]);
}

test.describe("Agentic debugging scenarios", () => {
  const submitManualGradeDecision = async (
    competitionId: string,
    answerId: string,
    correct: boolean,
    authToken: string,
  ): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      const client = io("http://127.0.0.1:4000", {
        transports: ["websocket"],
      });

      client.on("connect", () => {
        client.emit("HOST_GRADE_DECISION", { competitionId, answerId, correct, authToken });
        setTimeout(() => {
          client.disconnect();
          resolve();
        }, 150);
      });

      client.on("connect_error", (err) => {
        client.disconnect();
        reject(err);
      });
    });
  };

  const waitForPendingAnswers = async (
    api: APIRequestContext,
    competitionId: string,
    expectedCount: number,
  ): Promise<PendingAnswer[]> => {
    await expect.poll(
      async () => {
        const res = await api.get(`/api/admin/pending-answers?competitionId=${competitionId}`);
        if (!res.ok()) {
          return 0;
        }
        const rows = (await res.json()) as PendingAnswer[];
        return rows.length;
      },
      { timeout: 20_000 },
    ).toBeGreaterThanOrEqual(expectedCount);

    const res = await api.get(`/api/admin/pending-answers?competitionId=${competitionId}`);
    if (res.ok()) {
      return (await res.json()) as PendingAnswer[];
    }
    return [];
  };

  test("timeout ends question when not all teams submit", async ({ browser }) => {
    const adminApi = await createAdminApi();

    let competitionId = "";
    const hostContext = await browser.newContext();
    const playerOneContext = await browser.newContext();
    const playerTwoContext = await browser.newContext();

    try {
      const fixture = await createOpenWordCompetition(adminApi, {
        grading: "AUTO",
        timeLimitSeconds: 3,
      });
      competitionId = fixture.id;

      const hostPage = await hostContext.newPage();
      const playerOnePage = await playerOneContext.newPage();
      const playerTwoPage = await playerTwoContext.newPage();

      await loginHostAndSelectCompetition(hostPage, competitionId);
      await joinPlayer(playerOnePage, competitionId, "Timeout Team One");
      await joinPlayer(playerTwoPage, competitionId, "Timeout Team Two");

      await moveToQuestionActive(hostPage);

      await playerOnePage.getByTestId("player-open-answer-input").fill("Jerusalem");
      await playerOnePage.getByTestId("player-submit-answer").click();

      await expect(hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
        timeout: 20_000,
      });
      await expect(playerTwoPage.getByTestId("player-phase")).toHaveText("GRADING", {
        timeout: 20_000,
      });
    } finally {
      if (competitionId) {
        await adminApi.delete(`/api/admin/competitions/${competitionId}`);
      }
      await hostContext.close();
      await playerOneContext.close();
      await playerTwoContext.close();
      await adminApi.dispose();
    }
  });

  test("reconnect sync keeps real remaining time during active question", async ({ browser }) => {
    const adminApi = await createAdminApi();

    let competitionId = "";
    const hostContext = await browser.newContext();
    const playerOneContext = await browser.newContext();
    const playerTwoContext = await browser.newContext();

    try {
      const fixture = await createOpenWordCompetition(adminApi, {
        grading: "AUTO",
        timeLimitSeconds: 12,
      });
      competitionId = fixture.id;

      const hostPage = await hostContext.newPage();
      let playerOnePage = await playerOneContext.newPage();
      const playerTwoPage = await playerTwoContext.newPage();

      await loginHostAndSelectCompetition(hostPage, competitionId);
      await joinPlayer(playerOnePage, competitionId, "Reconnect Team One");
      await joinPlayer(playerTwoPage, competitionId, "Reconnect Team Two");

      await moveToQuestionActive(hostPage);

      await expect(playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
        timeout: 20_000,
      });

      const initialTimerText = await playerOnePage.getByTestId("player-time-remaining").textContent();
      const initialTimeRemaining = parseRemainingSeconds(initialTimerText ?? "");
      expect(initialTimeRemaining).toBeGreaterThan(0);

      await playerOnePage.waitForTimeout(2000);
      await playerOnePage.close();

      playerOnePage = await playerOneContext.newPage();
      await playerOnePage.goto("/play");
      await expect(playerOnePage.getByTestId("player-phase")).toHaveText("QUESTION_ACTIVE", {
        timeout: 20_000,
      });

      const reconnectedTimerText = await playerOnePage.getByTestId("player-time-remaining").textContent();
      const reconnectedTimeRemaining = parseRemainingSeconds(reconnectedTimerText ?? "");
      expect(reconnectedTimeRemaining).toBeLessThan(initialTimeRemaining);
    } finally {
      if (competitionId) {
        await adminApi.delete(`/api/admin/competitions/${competitionId}`);
      }
      await hostContext.close();
      await playerOneContext.close();
      await playerTwoContext.close();
      await adminApi.dispose();
    }
  });

  test("manual grading decisions determine final leaderboard order", async ({ browser }) => {
    const adminApi = await createAdminApi();

    let competitionId = "";
    const hostContext = await browser.newContext();
    const playerOneContext = await browser.newContext();
    const playerTwoContext = await browser.newContext();

    try {
      const hostToken = await createHostSocketToken(adminApi);
      const fixture = await createOpenWordCompetition(adminApi, {
        grading: "MANUAL",
        timeLimitSeconds: 30,
      });
      competitionId = fixture.id;

      const hostPage = await hostContext.newPage();
      const playerOnePage = await playerOneContext.newPage();
      const playerTwoPage = await playerTwoContext.newPage();

      await loginHostAndSelectCompetition(hostPage, competitionId);
      await joinPlayer(playerOnePage, competitionId, "Manual Team One");
      await joinPlayer(playerTwoPage, competitionId, "Manual Team Two");

      await moveToQuestionActive(hostPage);

      await playerOnePage.getByTestId("player-open-answer-input").fill("Jerusalem");
      await playerOnePage.getByTestId("player-submit-answer").click();
      await playerTwoPage.getByTestId("player-open-answer-input").fill("Rome");
      await playerTwoPage.getByTestId("player-submit-answer").click();

      await expect(hostPage.getByTestId("host-current-phase")).toHaveText("GRADING", {
        timeout: 20_000,
      });

      const pending = await waitForPendingAnswers(adminApi, competitionId, 2);
      expect(pending.length).toBeGreaterThanOrEqual(2);
      const [firstPending, secondPending] = pending;

      await submitManualGradeDecision(competitionId, firstPending.id, true, hostToken);
      await submitManualGradeDecision(competitionId, secondPending.id, false, hostToken);

      await expect.poll(
        async () => {
          const res = await adminApi.get(`/api/admin/pending-answers?competitionId=${competitionId}`);
          if (!res.ok()) return -1;
          const rows = (await res.json()) as PendingAnswer[];
          return rows.length;
        },
        { timeout: 20_000 },
      ).toBe(0);

      await clickHostNextAndExpectPhase(hostPage, "REVEAL_ANSWER");
      await clickHostNextAndExpectPhase(hostPage, "ROUND_END");
      await clickHostNextAndExpectPhase(hostPage, "LEADERBOARD");

      await expect(playerOnePage.getByTestId("player-leaderboard")).toBeVisible({
        timeout: 20_000,
      });

      const rows = playerOnePage.getByTestId(/leaderboard-team-/);
      await expect(rows).toHaveCount(2);
      await expect(rows.first()).toContainText("Manual Team One");
    } finally {
      if (competitionId) {
        await adminApi.delete(`/api/admin/competitions/${competitionId}`);
      }
      await hostContext.close();
      await playerOneContext.close();
      await playerTwoContext.close();
      await adminApi.dispose();
    }
  });
});
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

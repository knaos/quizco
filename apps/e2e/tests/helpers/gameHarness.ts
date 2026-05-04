import { expect, request, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const ADMIN_AUTH_HEADER = {};
const HOST_PASSWORD = process.env.HOST_PASSWORD ?? "change-me-host";

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

const HOST_PASSWORD = process.env.E2E_HOST_PASSWORD ?? process.env.HOST_PASSWORD ?? readServerEnvValue("HOST_PASSWORD") ?? "host123";

export interface QuestionDraft {
  questionText: string;
  source?: string;
  type:
    | "CLOSED"
    | "MULTIPLE_CHOICE"
    | "OPEN_WORD"
    | "CROSSWORD"
    | "FILL_IN_THE_BLANKS"
    | "MATCHING"
    | "CHRONOLOGY"
    | "TRUE_FALSE"
    | "CORRECT_THE_ERROR";
  points?: number;
  timeLimitSeconds?: number;
  grading?: "AUTO" | "MANUAL";
  section?: string;
  index?: number;
  realIndex?: number;
  content: unknown;
}

export interface CompetitionFixture {
  competitionId: string;
  questionIds: string[];
}

export interface SessionPages {
  hostPage: Page;
  playerOnePage: Page;
  playerTwoPage: Page;
  close: () => Promise<void>;
}

export async function createAdminApi(): Promise<APIRequestContext> {
  const authApi = await request.newContext({
    baseURL: "http://127.0.0.1:4000",
  });
  const loginRes = await authApi.post("/api/auth/login", {
    data: {
      role: "admin",
      password: "admin123",
    },
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = (await loginRes.json()) as { token: string };
  await authApi.dispose();

  return request.newContext({
    baseURL: "http://127.0.0.1:4000",
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createCompetitionWithQuestions(
  api: APIRequestContext,
  titlePrefix: string,
  questions: QuestionDraft[],
): Promise<CompetitionFixture> {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const title = `${titlePrefix} ${uniqueSuffix}`;

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

  const questionIds: string[] = [];
  for (const question of questions) {
    const createQuestionRes = await api.post("/api/admin/questions", {
      data: {
        roundId: round.id,
        questionText: question.questionText,
        source: question.source,
        type: question.type,
        points: question.points ?? 10,
        timeLimitSeconds: question.timeLimitSeconds ?? 30,
        grading: question.grading ?? "AUTO",
        section: question.section,
        index: question.index,
        realIndex: question.realIndex,
        content: question.content,
      },
    });
    if (!createQuestionRes.ok()) {
      throw new Error(`create question failed: ${createQuestionRes.status()} ${await createQuestionRes.text()}`);
    }
    const createdQuestion = (await createQuestionRes.json()) as { id: string };
    questionIds.push(createdQuestion.id);
  }

  return {
    competitionId: competition.id,
    questionIds,
  };
}

export async function deleteCompetition(api: APIRequestContext, competitionId: string): Promise<void> {
  await api.delete(`/api/admin/competitions/${competitionId}`);
}

export async function createHostAndPlayers(
  browser: Browser,
  competitionId: string,
  teamOneName: string,
  teamTwoName: string,
): Promise<SessionPages> {
  const hostContext = await browser.newContext();
  const playerOneContext = await browser.newContext();
  const playerTwoContext = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const playerOnePage = await playerOneContext.newPage();
  const playerTwoPage = await playerTwoContext.newPage();

  await hostPage.goto("/host");
  await hostPage.getByTestId("host-password-input").fill(HOST_PASSWORD);
  await hostPage.getByTestId("host-login-submit").click();
  await hostPage.getByTestId(`host-competition-option-${competitionId}`).click();
  await expect(hostPage.getByTestId("host-current-phase")).toHaveText("WAITING");

  await playerOnePage.goto("/play");
  await playerOnePage.getByTestId(`competition-option-${competitionId}`).click();
  await playerOnePage.getByTestId("team-name-input").fill(teamOneName);
  await playerOnePage.getByTestId("join-team-submit").click();
  await expect(playerOnePage.getByTestId("player-phase")).toHaveText("WAITING");

  await playerTwoPage.goto("/play");
  await playerTwoPage.getByTestId(`competition-option-${competitionId}`).click();
  await playerTwoPage.getByTestId("team-name-input").fill(teamTwoName);
  await playerTwoPage.getByTestId("join-team-submit").click();
  await expect(playerTwoPage.getByTestId("player-phase")).toHaveText("WAITING");

  return {
    hostPage,
    playerOnePage,
    playerTwoPage,
    close: async () => {
      await Promise.allSettled([
        hostContext.close(),
        playerOneContext.close(),
        playerTwoContext.close(),
      ]);
    },
  };
}

export async function clickHostNextAndExpectPhase(hostPage: Page, expectedPhase: string): Promise<void> {
  const phase = hostPage.getByTestId("host-current-phase");
  const nextButton = hostPage.getByTestId("host-next-action");
  await expect(nextButton).toBeEnabled({ timeout: 20_000 });
  await nextButton.click();
  await expect(phase).toHaveText(expectedPhase, { timeout: 20_000 });
}

export async function moveToQuestionPreview(hostPage: Page): Promise<void> {
  await clickHostNextAndExpectPhase(hostPage, "WELCOME");
  await clickHostNextAndExpectPhase(hostPage, "ROUND_START");
  await clickHostNextAndExpectPhase(hostPage, "QUESTION_PREVIEW");
}

export async function movePreviewToActive(
  hostPage: Page,
  questionType: QuestionDraft["type"],
  multipleChoiceOptionCount: number = 0,
): Promise<void> {
  if (questionType === "MULTIPLE_CHOICE") {
    for (let i = 0; i < multipleChoiceOptionCount; i++) {
      await clickHostNextAndExpectPhase(hostPage, "QUESTION_PREVIEW");
    }
  }
  await clickHostNextAndExpectPhase(hostPage, "QUESTION_ACTIVE");
}

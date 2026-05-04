import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createQuizServer } from "../createQuizServer";
import { GameManager } from "../GameManager";
import { MockGameRepository } from "./mocks/MockGameRepository";
import { TimerService } from "../services/TimerService";
import { Logger } from "../utils/Logger";
import { Server } from "http";
import { AddressInfo } from "net";
import { createHostTestToken, createAdminTestToken } from "./authTestUtils";

describe("Question Answers API E2E", () => {
  let httpServer: Server;
  let gameManager: GameManager;
  let mockRepository: MockGameRepository;
  let port: number;
  let baseUrl: string;
  let hostAuthToken: string;
  let adminAuthToken: string;

  const competitionId = "test-comp-id";

  beforeAll(async () => {
    mockRepository = new MockGameRepository();
    const timerService = new TimerService();
    const logger = new Logger("QuestionAnswersTest");
    gameManager = new GameManager(mockRepository, timerService, logger);
    hostAuthToken = createHostTestToken();
    adminAuthToken = createAdminTestToken();
    const serverSetup = createQuizServer(gameManager, mockRepository);
    httpServer = serverSetup.httpServer;

    return new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as AddressInfo).port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    httpServer.close();
  });

  beforeEach(() => {
    mockRepository.teams = [];
    mockRepository.questions = [];
    mockRepository.answers = [];
    mockRepository.answerSnapshots = [];
  });

  it("should return formatted answers for a question", async () => {
    // 1. Setup competition data
    const questionId = "q1";
    const roundId = "r1";

    mockRepository.questions.push({
      id: questionId,
      roundId: roundId,
      questionText: "Test Question",
      type: "MULTIPLE_CHOICE",
      points: 10,
      content: { options: ["A", "B"], correctIndices: [0] },
      grading: "AUTO",
    } as any);

    const team = await mockRepository.getOrCreateTeam(
      competitionId,
      "Team A",
      "red",
    );
    await mockRepository.saveAnswer(
      team.id,
      questionId,
      roundId,
      [0],
      true,
      10,
    );

    // 2. Fetch answers via API
    const response = await fetch(
      `${baseUrl}/api/competitions/${competitionId}/questions/${questionId}/answers`,
      {
        headers: {
          Authorization: `Bearer ${hostAuthToken}`,
        },
      },
    );
    expect(response.status).toBe(200);

    const data = await response.json();

    // 3. Verify data format
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      teamName: "Team A",
      color: "red",
      submittedContent: [0],
      isCorrect: true,
      points: 10,
    });
  });

  it("should return empty array if no answers exist", async () => {
    const questionId = "q2";
    const response = await fetch(
      `${baseUrl}/api/competitions/${competitionId}/questions/${questionId}/answers`,
      {
        headers: {
          Authorization: `Bearer ${hostAuthToken}`,
        },
      },
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it("updates answer score and exposes history snapshots", async () => {
    const questionId = "q3";
    const roundId = "r3";

    mockRepository.questions.push({
      id: questionId,
      roundId,
      questionText: "History Question",
      type: "OPEN_WORD",
      points: 5,
      content: { answer: "Faith" },
      grading: "AUTO",
    } as any);

    const team = await mockRepository.getOrCreateTeam(
      competitionId,
      "Team History",
      "blue",
    );
    const answer = await mockRepository.saveAnswer(
      team.id,
      questionId,
      roundId,
      "Faith",
      true,
      5,
    );

    const patchResponse = await fetch(
      `${baseUrl}/api/admin/answers/${answer.id}/score`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminAuthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          competitionId,
          scoreAwarded: 3,
        }),
      },
    );

    expect(patchResponse.status).toBe(200);
    const patchData = await patchResponse.json();
    expect(patchData).toMatchObject({
      answerId: answer.id,
      scoreAwarded: 3,
    });

    const historyResponse = await fetch(
      `${baseUrl}/api/admin/competitions/${competitionId}/answer-history`,
      {
        headers: {
          Authorization: `Bearer ${adminAuthToken}`,
        },
      },
    );

    expect(historyResponse.status).toBe(200);
    const historyData = await historyResponse.json();
    expect(Array.isArray(historyData.records)).toBe(true);
    expect(historyData.records).toHaveLength(1);
    expect(historyData.records[0].latestScoreAwarded).toBe(3);
    expect(historyData.records[0].snapshots).toHaveLength(1);
    expect(historyData.records[0].snapshots[0].snapshotType).toBe("SCORE_ADJUSTMENT");
  });

  it("returns team-specific monitor records", async () => {
    const questionId = "q-team";
    const roundId = "r-team";
    mockRepository.questions.push({
      id: questionId,
      roundId,
      questionText: "Team monitor question",
      type: "OPEN_WORD",
      points: 5,
      content: { answer: "faith" },
      grading: "AUTO",
    } as any);

    const teamOne = await mockRepository.getOrCreateTeam(competitionId, "Team One", "red");
    const teamTwo = await mockRepository.getOrCreateTeam(competitionId, "Team Two", "blue");
    await mockRepository.saveAnswer(teamOne.id, questionId, roundId, "faith", true, 5);
    await mockRepository.saveAnswer(teamTwo.id, questionId, roundId, "hope", false, 0);

    const response = await fetch(
      `${baseUrl}/api/admin/competitions/${competitionId}/teams/${teamOne.id}/answers`,
      {
        headers: {
          Authorization: `Bearer ${adminAuthToken}`,
        },
      },
    );

    expect(response.status).toBe(200);
    const data = await response.json() as { records: Array<{ teamId: string }> };
    expect(data.records).toHaveLength(1);
    expect(data.records[0].teamId).toBe(teamOne.id);
  });
});

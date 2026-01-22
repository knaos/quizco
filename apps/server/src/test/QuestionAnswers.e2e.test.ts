import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createQuizServer } from "../createQuizServer";
import { GameManager } from "../GameManager";
import { MockGameRepository } from "./mocks/MockGameRepository";
import { TimerService } from "../services/TimerService";
import { Logger } from "../utils/Logger";
import { Server } from "http";
import { AddressInfo } from "net";

describe("Question Answers API E2E", () => {
  let httpServer: Server;
  let gameManager: GameManager;
  let mockRepository: MockGameRepository;
  let port: number;
  let baseUrl: string;

  const competitionId = "test-comp-id";

  beforeAll(async () => {
    mockRepository = new MockGameRepository();
    const timerService = new TimerService();
    const logger = new Logger("QuestionAnswersTest");
    gameManager = new GameManager(mockRepository, timerService, logger);
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
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });
});

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { createQuizServer } from "../createQuizServer";
import { GameManager } from "../GameManager";
import { MockGameRepository } from "./mocks/MockGameRepository";
import { TimerService } from "../services/TimerService";
import { Logger } from "../utils/Logger";
import { io as Client, Socket } from "socket.io-client";
import { Server } from "http";
import { AddressInfo } from "net";
import { createHostTestToken } from "./authTestUtils";

describe("Game Loop E2E (Decoupled)", () => {
  let httpServer: Server;
  let hostSocket: Socket;
  let player1Socket: Socket;
  let player2Socket: Socket;
  let gameManager: GameManager;
  let mockRepository: MockGameRepository;
  let port: number;
  let hostAuthToken: string;

  const competitionId = "test-competition-id";

  beforeAll(async () => {
    mockRepository = new MockGameRepository();
    const timerService = new TimerService();
    const logger = new Logger("GameLoopTest");
    gameManager = new GameManager(mockRepository, timerService, logger);
    hostAuthToken = createHostTestToken();
    const serverSetup = createQuizServer(gameManager, mockRepository);
    httpServer = serverSetup.httpServer;

    return new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    httpServer.close();
  });

  beforeEach(async () => {
    mockRepository.teams = [];
    mockRepository.questions = [];
    mockRepository.answers = [];

    // Seed mock questions
    mockRepository.questions.push({
      id: "q1",
      roundId: "r1",
      questionText: "What is 1+1?",
      type: "MULTIPLE_CHOICE",
      points: 1,
      timeLimitSeconds: 2, // Short for testing
      content: { options: ["1", "2"], correctIndices: [1] },
      grading: "AUTO",
    } as any);

    const createSocket = () => {
      return Client(`http://localhost:${port}`, {
        transports: ["websocket"],
        forceNew: true,
      });
    };

    hostSocket = createSocket();
    player1Socket = createSocket();
    player2Socket = createSocket();

    await Promise.all([
      new Promise<void>((r) => hostSocket.on("connect", () => r())),
      new Promise<void>((r) => player1Socket.on("connect", () => r())),
      new Promise<void>((r) => player2Socket.on("connect", () => r())),
    ]);
  });

  afterEach(() => {
    hostSocket?.disconnect();
    player1Socket?.disconnect();
    player2Socket?.disconnect();
  });

  it("should complete a full question cycle with two players", async () => {

  });

  it("should reject SUBMIT_ANSWER for unknown team and return failure callback", async () => {
    const rejectCompetitionId = "test-competition-reject";
    hostSocket.emit("HOST_JOIN_ROOM", {
      competitionId: rejectCompetitionId,
      authToken: hostAuthToken,
    });

    await new Promise<void>((resolve) => {
      player1Socket.emit(
        "JOIN_ROOM",
        { competitionId: rejectCompetitionId, teamName: "Team 1", color: "red" },
        () => resolve(),
      );
    });

    hostSocket.emit("HOST_START_QUESTION", {
      competitionId: rejectCompetitionId,
      questionId: "q1",
      authToken: hostAuthToken,
    });

    await new Promise<void>((resolve) => {
      player1Socket.on("GAME_STATE_SYNC", (syncState) => {
        if (syncState.phase === "QUESTION_PREVIEW") {
          resolve();
        }
      });
    });

    hostSocket.emit("HOST_START_TIMER", {
      competitionId: rejectCompetitionId,
      authToken: hostAuthToken,
    });

    await new Promise<void>((resolve) => {
      player1Socket.on("GAME_STATE_SYNC", (syncState) => {
        if (syncState.phase === "QUESTION_ACTIVE") {
          resolve();
        }
      });
    });

    const callbackResponse = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      player1Socket.emit(
        "SUBMIT_ANSWER",
        {
          competitionId: rejectCompetitionId,
          teamId: "00000000-0000-0000-0000-000000000000",
          questionId: "q1",
          answer: [1],
          isFinal: true,
        },
        (res: { success: boolean; error?: string }) => resolve(res),
      );
    });

    expect(callbackResponse.success).toBe(false);
    expect(callbackResponse.error).toBe("TEAM_NOT_FOUND");
    expect(mockRepository.answers).toHaveLength(0);
  });
});

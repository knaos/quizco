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

describe("Timer Pause/Resume E2E", () => {
  let httpServer: Server;
  let hostSocket: Socket;
  let playerSocket: Socket;
  let gameManager: GameManager;
  let mockRepository: MockGameRepository;
  let port: number;
  let hostAuthToken: string;

  const competitionId = "timer-test-competition";

  beforeAll(async () => {
    mockRepository = new MockGameRepository();
    const timerService = new TimerService();
    const logger = new Logger("TimerPauseResumeTest");
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

    mockRepository.questions.push({
      id: "q1",
      roundId: "r1",
      questionText: "Pause/Resume Test?",
      type: "CLOSED",
      points: 10,
      timeLimitSeconds: 10,
      content: {},
      grading: "AUTO",
    } as any);

    const createSocket = () => {
      return Client(`http://localhost:${port}`, {
        transports: ["websocket"],
        forceNew: true,
      });
    };

    hostSocket = createSocket();
    playerSocket = createSocket();

    await Promise.all([
      new Promise<void>((r) => hostSocket.on("connect", () => r())),
      new Promise<void>((r) => playerSocket.on("connect", () => r())),
    ]);
  });

  afterEach(() => {
    hostSocket?.disconnect();
    playerSocket?.disconnect();
  });

  it("should pause and resume the timer via socket events", async () => {
    // 1. Setup
    hostSocket.emit("HOST_JOIN_ROOM", { competitionId, authToken: hostAuthToken });
    await new Promise<void>((resolve) => {
      playerSocket.emit(
        "JOIN_ROOM",
        { competitionId, teamName: "Test Team", color: "green" },
        () => resolve(),
      );
    });

    // 2. Start Question and Timer
    hostSocket.emit("HOST_START_QUESTION", {
      competitionId,
      questionId: "q1",
      authToken: hostAuthToken,
    });

    // Wait for preview
    await new Promise<void>((resolve) => {
      playerSocket.once("GAME_STATE_SYNC", () => resolve());
    });

    hostSocket.emit("HOST_START_TIMER", { competitionId, authToken: hostAuthToken });

    // Wait for active
    await new Promise<void>((resolve) => {
      playerSocket.once("GAME_STATE_SYNC", (state) => {
        expect(state.phase).toBe("QUESTION_ACTIVE");
        expect(state.timerPaused).toBe(false);
        resolve();
      });
    });

    // 3. Pause Timer
    hostSocket.emit("HOST_PAUSE_TIMER", { competitionId, authToken: hostAuthToken });

    await new Promise<void>((resolve) => {
      playerSocket.once("GAME_STATE_SYNC", (state) => {
        expect(state.timerPaused).toBe(true);
        resolve();
      });
    });

    // 4. Resume Timer
    hostSocket.emit("HOST_RESUME_TIMER", { competitionId, authToken: hostAuthToken });

    await new Promise<void>((resolve) => {
      playerSocket.once("GAME_STATE_SYNC", (state) => {
        expect(state.timerPaused).toBe(false);
        resolve();
      });
    });
  });
});

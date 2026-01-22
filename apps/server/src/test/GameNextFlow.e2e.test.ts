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

describe("Game Loop E2E (Next Flow)", () => {
  let httpServer: Server;
  let hostSocket: Socket;
  let playerSocket: Socket;
  let gameManager: GameManager;
  let mockRepository: MockGameRepository;
  let port: number;

  const competitionId = "test-comp-next";

  beforeAll(async () => {
    mockRepository = new MockGameRepository();
    const timerService = new TimerService();
    const logger = new Logger("GameNextFlowTest");
    gameManager = new GameManager(mockRepository, timerService, logger);
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
      questionText: "Q1",
      type: "MULTIPLE_CHOICE",
      points: 10,
      timeLimitSeconds: 30,
      content: { options: ["A", "B"], correctIndex: 1 },
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

  it("should follow the 'next' flow correctly over the socket", async () => {
    hostSocket.emit("HOST_JOIN_ROOM", { competitionId });
    await new Promise<void>((resolve) => {
      hostSocket.once("GAME_STATE_SYNC", () => resolve());
    });

    // WAITING -> WELCOME
    hostSocket.emit("HOST_NEXT", { competitionId });
    await new Promise<void>((resolve) => {
      hostSocket.once("GAME_STATE_SYNC", (state) => {
        expect(state.phase).toBe("WELCOME");
        resolve();
      });
    });

    // WELCOME -> ROUND_START
    hostSocket.emit("HOST_NEXT", { competitionId });
    await new Promise<void>((resolve) => {
      hostSocket.once("GAME_STATE_SYNC", (state) => {
        expect(state.phase).toBe("ROUND_START");
        expect(state.currentQuestion.id).toBe("q1");
        resolve();
      });
    });

    // ROUND_START -> QUESTION_PREVIEW
    hostSocket.emit("HOST_NEXT", { competitionId });
    await new Promise<void>((resolve) => {
      hostSocket.once("GAME_STATE_SYNC", (state) => {
        expect(state.phase).toBe("QUESTION_PREVIEW");
        expect(state.revealStep).toBe(0);
        resolve();
      });
    });

    // QUESTION_PREVIEW -> Reveal Option A
    hostSocket.emit("HOST_NEXT", { competitionId });
    await new Promise<void>((resolve) => {
      hostSocket.once("GAME_STATE_SYNC", (state) => {
        expect(state.revealStep).toBe(1);
        resolve();
      });
    });

    // Reveal Option A -> Reveal Option B
    hostSocket.emit("HOST_NEXT", { competitionId });
    await new Promise<void>((resolve) => {
      hostSocket.once("GAME_STATE_SYNC", (state) => {
        expect(state.revealStep).toBe(2);
        resolve();
      });
    });

    // Reveal Option B -> QUESTION_ACTIVE
    hostSocket.emit("HOST_NEXT", { competitionId });
    await new Promise<void>((resolve) => {
      hostSocket.once("GAME_STATE_SYNC", (state) => {
        expect(state.phase).toBe("QUESTION_ACTIVE");
        resolve();
      });
    });
  });
});

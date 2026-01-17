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
import { io as Client, Socket } from "socket.io-client";
import { Server } from "http";
import { AddressInfo } from "net";

describe("Game Loop E2E (Decoupled)", () => {
  let httpServer: Server;
  let hostSocket: Socket;
  let player1Socket: Socket;
  let player2Socket: Socket;
  let gameManager: GameManager;
  let mockRepository: MockGameRepository;
  let port: number;

  const competitionId = "test-competition-id";

  beforeAll(async () => {
    mockRepository = new MockGameRepository();
    gameManager = new GameManager(mockRepository);
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
      points: 10,
      timeLimitSeconds: 2, // Short for testing
      content: { options: ["1", "2"], correctIndex: 1 },
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
    // 1. Host joins room
    hostSocket.emit("HOST_JOIN_ROOM", { competitionId });

    // 2. Players join room
    await new Promise<void>((resolve) => {
      player1Socket.emit(
        "JOIN_ROOM",
        { competitionId, teamName: "Team 1", color: "red" },
        () => resolve(),
      );
    });

    await new Promise<void>((resolve) => {
      player2Socket.emit(
        "JOIN_ROOM",
        { competitionId, teamName: "Team 2", color: "blue" },
        () => resolve(),
      );
    });

    // Verify players are in the state
    const state = gameManager.getState(competitionId);
    expect(state.teams).toHaveLength(2);

    // 3. Host starts question
    hostSocket.emit("HOST_START_QUESTION", { competitionId, questionId: "q1" });

    // Wait for state sync on clients
    await new Promise<void>((resolve) => {
      player1Socket.once("GAME_STATE_SYNC", (syncState) => {
        expect(syncState.phase).toBe("QUESTION_PREVIEW");
        expect(syncState.currentQuestion.id).toBe("q1");
        resolve();
      });
    });

    // 4. Host starts timer
    hostSocket.emit("HOST_START_TIMER", { competitionId });

    await new Promise<void>((resolve) => {
      player1Socket.once("GAME_STATE_SYNC", (syncState) => {
        expect(syncState.phase).toBe("QUESTION_ACTIVE");
        resolve();
      });
    });

    // 5. Players submit answers
    const team1Id = state.teams.find((t) => t.name === "Team 1")!.id;
    const team2Id = state.teams.find((t) => t.name === "Team 2")!.id;

    player1Socket.emit("SUBMIT_ANSWER", {
      competitionId,
      teamId: team1Id,
      questionId: "q1",
      answer: 1, // Correct
    });

    player2Socket.emit("SUBMIT_ANSWER", {
      competitionId,
      teamId: team2Id,
      questionId: "q1",
      answer: 0, // Incorrect
    });

    // 6. Wait for transition to GRADING (all answered)
    await new Promise<void>((resolve) => {
      hostSocket.on("GAME_STATE_SYNC", (syncState) => {
        if (syncState.phase === "GRADING") {
          resolve();
        }
      });
    });

    // 7. Verify scores
    const finalState = gameManager.getState(competitionId);
    const team1 = finalState.teams.find((t) => t.id === team1Id);
    const team2 = finalState.teams.find((t) => t.id === team2Id);

    expect(team1?.score).toBe(10);
    expect(team2?.score).toBe(0);
    expect(team1?.lastAnswerCorrect).toBe(true);
    expect(team2?.lastAnswerCorrect).toBe(false);
  });
});

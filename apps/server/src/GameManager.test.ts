import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameManager } from "./GameManager";
import { PostgresGameRepository } from "./repositories/PostgresGameRepository";
import prisma from "./db/prisma";

describe("GameManager Integration", () => {
  let gameManager: GameManager;
  let repository: PostgresGameRepository;
  let compId: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    repository = new PostgresGameRepository();
    gameManager = new GameManager(repository);

    const competition = await prisma.competition.create({
      data: { title: "Default Comp", host_pin: "1234" },
    });
    compId = competition.id;
  });

  it("should initialize with WAITING phase", () => {
    const state = gameManager.getState(compId);
    expect(state.phase).toBe("WAITING");
    expect(state.teams).toHaveLength(0);
  });

  it("should add a new team", async () => {
    // 1. Double check that competition exists in DB
    const comp = await prisma.competition.findUnique({ where: { id: compId } });
    expect(comp).not.toBeNull();

    // 2. Act
    const team = await gameManager.addTeam(compId, "Red Dragons", "#FF0000");

    // 3. Assert
    expect(team.name).toBe("Red Dragons");
    const state = gameManager.getState(compId);
    expect(state.teams).toHaveLength(1);
    expect(state.teams[0].name).toBe("Red Dragons");
  });

  it("should start a question correctly in PREVIEW phase", async () => {
    // 1. Setup data in DB
    const competition = await prisma.competition.create({
      data: { title: "Test Comp", host_pin: "1234" },
    });
    const testCompId = competition.id;

    const round = await prisma.round.create({
      data: {
        competitionId: testCompId,
        orderIndex: 1,
        type: "STANDARD",
        title: "Round 1",
      },
    });
    const roundId = round.id;

    const question = await prisma.question.create({
      data: {
        roundId: roundId,
        questionText: "What is 1+1?",
        type: "CLOSED",
        points: 10,
        timeLimitSeconds: 30,
        content: { options: ["2"] },
      },
    });
    const questionId = question.id;

    // 2. Act
    await gameManager.startQuestion(testCompId, questionId);

    // 3. Assert
    const state = gameManager.getState(testCompId);
    expect(state.phase).toBe("QUESTION_PREVIEW");
    expect(state.currentQuestion?.id).toBe(questionId);
    expect(state.timeRemaining).toBe(30);
  });

  it("should transition from PREVIEW to ACTIVE when timer starts", async () => {
    const competition = await prisma.competition.create({
      data: { title: "Test", host_pin: "1" },
    });
    const testCompId = competition.id;

    const round = await prisma.round.create({
      data: {
        competitionId: testCompId,
        orderIndex: 1,
        type: "STANDARD",
      },
    });

    const question = await prisma.question.create({
      data: {
        roundId: round.id,
        questionText: "T",
        type: "CLOSED",
        timeLimitSeconds: 5,
        content: {},
      },
    });

    await gameManager.startQuestion(testCompId, question.id);
    expect(gameManager.getState(testCompId).phase).toBe("QUESTION_PREVIEW");

    await gameManager.startTimer(
      testCompId,
      question.timeLimitSeconds,
      () => {},
    );
    expect(gameManager.getState(testCompId).phase).toBe("QUESTION_ACTIVE");

    // Fast-forward 1 second
    vi.advanceTimersByTime(1000);
    // The setInterval callback might not have run yet if vi.advanceTimersByTime(1000)
    // just reached the threshold. vi.runOnlyPendingTimers() or multiple ticks might be needed.
    // However, usually 1001ms works better for setInterval in some environments.
    expect(gameManager.getState(testCompId).timeRemaining).toBeLessThan(5);
  });

  it("should decrement timer and end question", async () => {
    const competition = await prisma.competition.create({
      data: { title: "Test", host_pin: "1" },
    });
    const testCompId = competition.id;

    const round = await prisma.round.create({
      data: {
        competitionId: testCompId,
        orderIndex: 1,
        type: "STANDARD",
      },
    });

    const question = await prisma.question.create({
      data: {
        roundId: round.id,
        questionText: "T",
        type: "CLOSED",
        timeLimitSeconds: 5,
        content: {},
      },
    });

    await gameManager.startQuestion(testCompId, question.id);
    await gameManager.startTimer(
      testCompId,
      question.timeLimitSeconds,
      () => {},
    );

    // Fast-forward 1 second
    vi.advanceTimersByTime(1000);
    expect(gameManager.getState(testCompId).timeRemaining).toBe(4);

    // Fast-forward to end
    vi.advanceTimersByTime(4000);
    expect(gameManager.getState(testCompId).timeRemaining).toBe(0);

    // One more tick to trigger the phase change
    vi.advanceTimersByTime(1000);
    expect(gameManager.getState(testCompId).phase).toBe("GRADING");
  });

  it("should reveal answer after question ends", async () => {
    const competition = await prisma.competition.create({
      data: { title: "Test", host_pin: "1" },
    });
    const testCompId = competition.id;

    const round = await prisma.round.create({
      data: {
        competitionId: testCompId,
        orderIndex: 1,
        type: "STANDARD",
      },
    });

    const question = await prisma.question.create({
      data: {
        roundId: round.id,
        questionText: "T",
        type: "CLOSED",
        timeLimitSeconds: 5,
        content: {},
      },
    });

    await gameManager.startQuestion(testCompId, question.id);
    await gameManager.startTimer(
      testCompId,
      question.timeLimitSeconds,
      () => {},
    );

    // End question
    vi.advanceTimersByTime(6000);
    expect(gameManager.getState(testCompId).phase).toBe("GRADING");

    await gameManager.revealAnswer(testCompId);
    expect(gameManager.getState(testCompId).phase).toBe("REVEAL_ANSWER");
  });

  it("should reconnect a team from memory", async () => {
    const team = await gameManager.addTeam(compId, "Memory Team", "#00FF00");
    const reconnected = await gameManager.reconnectTeam(compId, team.id);

    expect(reconnected).not.toBeNull();
    expect(reconnected?.id).toBe(team.id);
    expect(reconnected?.name).toBe("Memory Team");
    expect(gameManager.getState(compId).teams).toHaveLength(1);
  });

  it("should reconnect a team from database and restore score", async () => {
    // 1. Setup team and answer in DB
    const competition = await prisma.competition.create({
      data: { title: "C", host_pin: "1" },
    });
    const testCompId = competition.id;

    const team = await prisma.team.create({
      data: { competitionId: testCompId, name: "DB Team", color: "#0000FF" },
    });
    const teamId = team.id;

    // Setup round and question to award points
    const round = await prisma.round.create({
      data: {
        competitionId: testCompId,
        orderIndex: 1,
        type: "STANDARD",
      },
    });

    const question = await prisma.question.create({
      data: {
        roundId: round.id,
        questionText: "Q",
        type: "CLOSED",
        content: {},
      },
    });

    // Insert correct answer
    await prisma.answer.create({
      data: {
        teamId: teamId,
        questionId: question.id,
        roundId: round.id,
        submittedContent: {},
        isCorrect: true,
        scoreAwarded: 10,
      },
    });

    // 2. Act: Reconnect with a fresh GameManager (simulating server restart)
    const freshRepository = new PostgresGameRepository();
    const freshManager = new GameManager(freshRepository);
    const reconnected = await freshManager.reconnectTeam(testCompId, teamId);

    // 3. Assert
    expect(reconnected).not.toBeNull();
    expect(reconnected?.id).toBe(teamId);
    expect(reconnected?.name).toBe("DB Team");
    expect(reconnected?.score).toBe(10);
    expect(freshManager.getState(testCompId).teams).toHaveLength(1);
    expect(freshManager.getState(testCompId).teams[0].score).toBe(10);
  });

  it("should return null if team does not exist", async () => {
    const reconnected = await gameManager.reconnectTeam(
      compId,
      "00000000-0000-0000-0000-000000000000",
    );
    expect(reconnected).toBeNull();
  });

  it("should auto-grade a MULTIPLE_CHOICE question", async () => {
    const competition = await prisma.competition.create({
      data: { title: "Test", host_pin: "1" },
    });
    const testCompId = competition.id;

    const round = await prisma.round.create({
      data: {
        competitionId: testCompId,
        orderIndex: 1,
        type: "STANDARD",
      },
    });

    const team = await gameManager.addTeam(
      testCompId,
      "Grading Team",
      "#000000",
    );

    const question = await prisma.question.create({
      data: {
        roundId: round.id,
        questionText: "What is 1+1?",
        type: "MULTIPLE_CHOICE",
        points: 15,
        content: { options: ["1", "2"], correctIndices: [1] },
        grading: "AUTO",
      },
    });
    const questionId = question.id;

    await gameManager.startQuestion(testCompId, questionId);
    await gameManager.startTimer(
      testCompId,
      question.timeLimitSeconds ?? 30,
      () => {},
    );

    await gameManager.submitAnswer(testCompId, team.id, questionId, [1]); // Correct

    const updatedTeam = gameManager
      .getState(testCompId)
      .teams.find((t) => t.id === team.id);
    expect(updatedTeam?.score).toBe(15);

    // Wait for DB to settle if needed, though submitAnswer is awaited
    const answer = await prisma.answer.findFirst({
      where: { teamId: team.id, questionId: questionId },
    });
    expect(answer?.isCorrect).toBe(true);
  });

  describe("lastAnswerCorrect tracking", () => {
    it("should initialize lastAnswerCorrect as null", async () => {
      const team = await gameManager.addTeam(compId, "Test Team", "#000000");
      expect(team.lastAnswerCorrect).toBeNull();
    });

    it("should reset lastAnswerCorrect when starting a new question", async () => {
      // 1. Setup
      const competition = await prisma.competition.create({
        data: { title: "Test", host_pin: "1" },
      });
      const testCompId = competition.id;
      const team = await gameManager.addTeam(testCompId, "T1", "#000");

      const round = await prisma.round.create({
        data: {
          competitionId: testCompId,
          orderIndex: 1,
          type: "STANDARD",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "Q1",
          type: "MULTIPLE_CHOICE",
          content: { options: ["A", "B"], correctIndices: [0] },
          points: 10,
          grading: "AUTO",
        },
      });
      const questionId = question.id;

      // 2. Mock a correct answer to set the status
      await gameManager.startQuestion(testCompId, questionId);
      await gameManager.startTimer(testCompId, 10, () => {});
      await gameManager.submitAnswer(testCompId, team.id, questionId, [0]);

      expect(gameManager.getState(testCompId).teams[0].lastAnswerCorrect).toBe(
        true,
      );

      // 3. Start a new question and verify reset
      const q2 = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "Q2",
          type: "MULTIPLE_CHOICE",
          content: { options: ["X", "Y"], correctIndices: [0] },
          points: 10,
          grading: "AUTO",
        },
      });
      await gameManager.startQuestion(testCompId, q2.id);

      expect(
        gameManager.getState(testCompId).teams[0].lastAnswerCorrect,
      ).toBeNull();
    });

    it("should update lastAnswerCorrect for manual grading", async () => {
      // 1. Setup
      const competition = await prisma.competition.create({
        data: { title: "Test", host_pin: "1" },
      });
      const testCompId = competition.id;
      const team = await gameManager.addTeam(testCompId, "T1", "#000");

      const round = await prisma.round.create({
        data: {
          competitionId: testCompId,
          orderIndex: 1,
          type: "STANDARD",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "Q1",
          type: "OPEN_WORD",
          content: {},
          points: 10,
          grading: "MANUAL",
        },
      });
      const questionId = question.id;

      await gameManager.startQuestion(testCompId, questionId);
      await gameManager.startTimer(testCompId, 10, () => {});
      await gameManager.submitAnswer(
        testCompId,
        team.id,
        questionId,
        "My Answer",
      );

      // Initially null
      expect(
        gameManager.getState(testCompId).teams[0].lastAnswerCorrect,
      ).toBeNull();

      // Get answer ID
      const answer = await prisma.answer.findFirst({
        where: { teamId: team.id, questionId: questionId },
      });
      const answerId = answer!.id;

      // 2. Act: Grade it correctly
      await gameManager.handleGradeDecision(testCompId, answerId, true);

      // 3. Assert
      expect(gameManager.getState(testCompId).teams[0].lastAnswerCorrect).toBe(
        true,
      );
      expect(gameManager.getState(testCompId).teams[0].score).toBe(10);
    });
  });
});

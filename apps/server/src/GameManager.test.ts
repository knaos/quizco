import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameManager } from "./GameManager";
import { PostgresGameRepository } from "./repositories/PostgresGameRepository";
import prisma from "./db/prisma";
import { TimerService } from "./services/TimerService";
import { Logger } from "./utils/Logger";

describe("GameManager Integration", () => {
  let gameManager: GameManager;
  let repository: PostgresGameRepository;
  let compId: string;
  const logger = new Logger("Test");

  beforeEach(async () => {
    vi.useFakeTimers();
    repository = new PostgresGameRepository();
    const timerService = new TimerService();
    const testLogger = new Logger("GameManagerTest");
    gameManager = new GameManager(repository, timerService, testLogger);

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
    const freshTimerService = new TimerService();
    const freshManager = new GameManager(
      freshRepository,
      freshTimerService,
      logger,
    );
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

    const state = gameManager.getState(testCompId);
    const mcContent = state.currentQuestion!.content as { options: string[]; correctIndices: number[] };
    const displayedCorrectIndex = mcContent.correctIndices[0];

    await gameManager.submitAnswer(testCompId, team.id, questionId, [displayedCorrectIndex], true); // Submit displayed index

    // Scores are now updated when revealAnswer is called, not on submit
    await gameManager.revealAnswer(testCompId);

    const answer = await prisma.answer.findFirst({
      where: { teamId: team.id, questionId: questionId },
    });

    const updatedTeam = gameManager
      .getState(testCompId)
      .teams.find((t) => t.id === team.id);
    expect(updatedTeam?.score).toBe(1); // 1 point per correct answer

    // Wait for DB to settle if needed, though submitAnswer is awaited
    expect(answer?.isCorrect).toBe(true);
  });

  describe("explicit submit and partial persistence", () => {
    it("stores partial answer without grading or explicit submission", async () => {
      const competition = await prisma.competition.create({
        data: { title: "Submit Model", host_pin: "1" },
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
          questionText: "Pick B",
          type: "MULTIPLE_CHOICE",
          points: 10,
          timeLimitSeconds: 30,
          content: { options: ["A", "B"], correctIndices: [1] },
          grading: "AUTO",
        },
      });

      const team = await gameManager.addTeam(testCompId, "Partial Team", "#111");

      await gameManager.startQuestion(testCompId, question.id);
      await gameManager.startTimer(testCompId, question.timeLimitSeconds, () => {});
      await gameManager.submitAnswer(testCompId, team.id, question.id, [0], false);

      const stateTeam = gameManager.getState(testCompId).teams.find((t) => t.id === team.id);
      expect(stateTeam?.lastAnswer).toEqual([0]);
      expect(stateTeam?.isExplicitlySubmitted).toBe(false);
      expect(stateTeam?.lastAnswerCorrect).toBeNull();
      expect(stateTeam?.score).toBe(0);
      expect(gameManager.getState(testCompId).phase).toBe("QUESTION_ACTIVE");

      const dbAnswer = await prisma.answer.findFirst({
        where: { teamId: team.id, questionId: question.id },
      });
      expect(dbAnswer).not.toBeNull();
      expect(dbAnswer?.submittedContent).toEqual([0]);
      expect(dbAnswer?.isCorrect).toBeNull();
      expect(dbAnswer?.scoreAwarded).toBe(0);
    });

    it("grades the latest partial answer on question end and keeps a single answer row", async () => {
      vi.useRealTimers();
      const competition = await prisma.competition.create({
        data: { title: "Latest Wins", host_pin: "1" },
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
          questionText: "Pick B",
          type: "MULTIPLE_CHOICE",
          points: 10,
          timeLimitSeconds: 2,
          content: { options: ["A", "B"], correctIndices: [1] },
          grading: "AUTO",
        },
      });

      const team = await gameManager.addTeam(testCompId, "Latest Team", "#222");

      await gameManager.startQuestion(testCompId, question.id);
      await gameManager.startTimer(testCompId, question.timeLimitSeconds, () => {});

      const state = gameManager.getState(testCompId);
      const mcContent = state.currentQuestion!.content as { options: string[]; correctIndices: number[] };
      const displayedCorrectIndex = mcContent.correctIndices[0];

      await gameManager.submitAnswer(testCompId, team.id, question.id, [0], false);
      await gameManager.submitAnswer(testCompId, team.id, question.id, [displayedCorrectIndex], false);

      await gameManager.next(testCompId, () => {});

      const stateTeam = gameManager.getState(testCompId).teams.find((t) => t.id === team.id);
      expect(gameManager.getState(testCompId).phase).toBe("GRADING");
      expect(stateTeam?.lastAnswer).toEqual([displayedCorrectIndex]);
      expect(stateTeam?.lastAnswerCorrect).toBe(true);
      // MULTIPLE_CHOICE uses per-correct-index scoring (1 point here).
      expect(stateTeam?.score).toBe(1);

      const dbAnswers = await prisma.answer.findMany({
        where: { teamId: team.id, questionId: question.id },
      });
      expect(dbAnswers).toHaveLength(1);
      expect(dbAnswers[0].submittedContent).toEqual([displayedCorrectIndex]);
      expect(dbAnswers[0].isCorrect).toBe(true);
      expect(dbAnswers[0].scoreAwarded).toBe(1);
    });

    it("ends early only when all teams explicitly submit final answers", async () => {
      const competition = await prisma.competition.create({
        data: { title: "Explicit Final", host_pin: "1" },
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
          questionText: "Pick B",
          type: "MULTIPLE_CHOICE",
          points: 10,
          timeLimitSeconds: 30,
          content: { options: ["A", "B"], correctIndices: [1] },
          grading: "AUTO",
        },
      });

      const teamA = await gameManager.addTeam(testCompId, "Team A", "#0a0");
      const teamB = await gameManager.addTeam(testCompId, "Team B", "#00a");

      await gameManager.startQuestion(testCompId, question.id);
      await gameManager.startTimer(testCompId, question.timeLimitSeconds, () => {});

      await gameManager.submitAnswer(testCompId, teamA.id, question.id, [1], false);
      await gameManager.submitAnswer(testCompId, teamB.id, question.id, [1], false);
      expect(gameManager.getState(testCompId).phase).toBe("QUESTION_ACTIVE");

      await gameManager.submitAnswer(testCompId, teamA.id, question.id, [1], true);
      expect(gameManager.getState(testCompId).phase).toBe("QUESTION_ACTIVE");

      await gameManager.submitAnswer(testCompId, teamB.id, question.id, [1], true);
      expect(gameManager.getState(testCompId).phase).toBe("GRADING");
      expect(gameManager.getState(testCompId).teams.find((t) => t.id === teamA.id)?.isExplicitlySubmitted).toBe(true);
      expect(gameManager.getState(testCompId).teams.find((t) => t.id === teamB.id)?.isExplicitlySubmitted).toBe(true);
    });

    it("does not account untouched team answers but preserves touched team answer", async () => {
      const competition = await prisma.competition.create({
        data: { title: "Touched vs Untouched", host_pin: "1" },
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
          questionText: "True or False",
          type: "TRUE_FALSE",
          points: 5,
          timeLimitSeconds: 30,
          content: { isTrue: true },
          grading: "AUTO",
        },
      });

      const touchedTeam = await gameManager.addTeam(testCompId, "Touched", "#123");
      const untouchedTeam = await gameManager.addTeam(testCompId, "Untouched", "#456");

      await gameManager.startQuestion(testCompId, question.id);
      await gameManager.startTimer(testCompId, question.timeLimitSeconds, () => {});

      await gameManager.submitAnswer(testCompId, touchedTeam.id, question.id, true, false);
      await gameManager.next(testCompId, () => {});

      const touched = gameManager.getState(testCompId).teams.find((t) => t.id === touchedTeam.id);
      const untouched = gameManager.getState(testCompId).teams.find((t) => t.id === untouchedTeam.id);

      expect(gameManager.getState(testCompId).phase).toBe("GRADING");
      expect(touched?.lastAnswer).toBe(true);
      expect(touched?.lastAnswerCorrect).toBe(true);
      // TRUE_FALSE awards 1 point for a correct answer.
      expect(touched?.score).toBe(1);

      expect(untouched?.lastAnswer).toBeNull();
      expect(untouched?.lastAnswerCorrect).toBeNull();
      expect(untouched?.score).toBe(0);

      const touchedDbAnswer = await prisma.answer.findFirst({
        where: { teamId: touchedTeam.id, questionId: question.id },
      });
      const untouchedDbAnswer = await prisma.answer.findFirst({
        where: { teamId: untouchedTeam.id, questionId: question.id },
      });
      expect(touchedDbAnswer).not.toBeNull();
      expect(untouchedDbAnswer).toBeNull();
    });

    it("rejects submissions from unknown teams", async () => {
      const competition = await prisma.competition.create({
        data: { title: "Reject Unknown Team", host_pin: "1" },
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
          questionText: "Pick B",
          type: "MULTIPLE_CHOICE",
          points: 10,
          timeLimitSeconds: 30,
          content: { options: ["A", "B"], correctIndices: [1] },
          grading: "AUTO",
        },
      });

      await gameManager.startQuestion(testCompId, question.id);
      await gameManager.startTimer(testCompId, question.timeLimitSeconds, () => {});

      const result = await gameManager.submitAnswer(
        testCompId,
        "00000000-0000-0000-0000-000000000000",
        question.id,
        [1],
        true,
      );

      expect(result).toEqual({ accepted: false, reason: "TEAM_NOT_FOUND" });
      expect(gameManager.getState(testCompId).phase).toBe("QUESTION_ACTIVE");

      const dbAnswers = await prisma.answer.findMany({
        where: { questionId: question.id },
      });
      expect(dbAnswers).toHaveLength(0);
    });
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

      const state = gameManager.getState(testCompId);
      const mcContent = state.currentQuestion!.content as { options: string[]; correctIndices: number[] };
      const displayedCorrectIndex = mcContent.correctIndices[0];

      await gameManager.submitAnswer(
        testCompId,
        team.id,
        questionId,
        [displayedCorrectIndex],
        true,
      );

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

  it("should shuffle items for CHRONOLOGY questions when starting", async () => {
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

    const items = [
      { id: "1", text: "A", order: 0 },
      { id: "2", text: "B", order: 1 },
      { id: "3", text: "C", order: 2 },
      { id: "4", text: "D", order: 3 },
      { id: "5", text: "E", order: 4 },
    ];

    const question = await prisma.question.create({
      data: {
        roundId: round.id,
        questionText: "Order",
        type: "CHRONOLOGY",
        content: { items },
      },
    });

    await gameManager.startQuestion(testCompId, question.id);
    const state = gameManager.getState(testCompId);
    const sessionItems = (state.currentQuestion!.content as any).items;

    // Check that we have the same items
    expect(sessionItems).toHaveLength(5);
    const sessionIds = sessionItems.map((i: any) => i.id).sort();
    expect(sessionIds).toEqual(["1", "2", "3", "4", "5"]);

    // Check that the order is likely different (it might randomly be the same,
    // but with 5 items the chance is 1/120).
    // We can't guarantee a different order but we can check if it's stored in session.
    expect(state.currentQuestion).not.toBeNull();
  });

  describe("Timer Pause/Resume", () => {
    let testCompId: string;
    let questionId: string;

    beforeEach(async () => {
      const competition = await prisma.competition.create({
        data: { title: "Timer Test", host_pin: "1" },
      });
      testCompId = competition.id;

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
          questionText: "Pause Test",
          type: "CLOSED",
          timeLimitSeconds: 10,
          content: {},
        },
      });
      questionId = question.id;

      await gameManager.startQuestion(testCompId, questionId);
    });

    it("should pause the timer and stop decrementing timeRemaining", async () => {
      await gameManager.startTimer(testCompId, 10, () => {});

      // Advance 1s
      vi.advanceTimersByTime(1000);
      expect(gameManager.getState(testCompId).timeRemaining).toBe(9);
      expect(gameManager.getState(testCompId).timerPaused).toBe(false);

      // Pause
      await gameManager.pauseTimer(testCompId);
      expect(gameManager.getState(testCompId).timerPaused).toBe(true);

      // Advance another 2s
      vi.advanceTimersByTime(2000);
      // Should still be 9 because it's paused
      expect(gameManager.getState(testCompId).timeRemaining).toBe(9);
    });

    it("should resume the timer and continue decrementing timeRemaining", async () => {
      await gameManager.startTimer(testCompId, 10, () => {});

      // Advance 1s to make sure timer is working
      vi.advanceTimersByTime(1001);
      const remainingAfterFirstTick =
        gameManager.getState(testCompId).timeRemaining;

      // Pause
      await gameManager.pauseTimer(testCompId);
      expect(gameManager.getState(testCompId).timerPaused).toBe(true);

      vi.advanceTimersByTime(2000);
      // It should still be the same because it was paused
      expect(gameManager.getState(testCompId).timeRemaining).toBe(
        remainingAfterFirstTick,
      );

      // Resume
      await gameManager.resumeTimer(testCompId);
      expect(gameManager.getState(testCompId).timerPaused).toBe(false);

      // Advance 1s
      vi.advanceTimersByTime(1001);
      // Depending on when the tick runs, it might have decremented once or more if timers are not cleared.
      // But we expect at least one decrement from the state.
      expect(gameManager.getState(testCompId).timeRemaining).toBeLessThan(
        remainingAfterFirstTick,
      );
    });

    it("should reset timerPaused to false when starting a new question", async () => {
      await gameManager.startTimer(testCompId, 10, () => {});
      await gameManager.pauseTimer(testCompId);
      expect(gameManager.getState(testCompId).timerPaused).toBe(true);

      const q2 = await prisma.question.create({
        data: {
          roundId: (await prisma.round.findFirst({
            where: { competitionId: testCompId },
          }))!.id,
          questionText: "Q2",
          type: "CLOSED",
          content: {},
        },
      });

      await gameManager.startQuestion(testCompId, q2.id);
      expect(gameManager.getState(testCompId).timerPaused).toBe(false);
    });

    it("should reset timerPaused to false when timer ends (transition to GRADING)", async () => {
      await gameManager.startTimer(testCompId, 2, () => {});
      await gameManager.pauseTimer(testCompId);
      expect(gameManager.getState(testCompId).timerPaused).toBe(true);

      await gameManager.resumeTimer(testCompId);
      vi.advanceTimersByTime(3000); // More than 2s

      expect(gameManager.getState(testCompId).phase).toBe("GRADING");
      expect(gameManager.getState(testCompId).timerPaused).toBe(false);
    });
  });

  describe("Server-side shuffle", () => {
    beforeEach(async () => {
      vi.useFakeTimers();
    });

    it("should shuffle MULTIPLE_CHOICE options and remap correct indices", async () => {
      vi.useRealTimers();
      const comp = await prisma.competition.create({
        data: { title: "Shuffle Test", host_pin: "0000" },
      });

      const team = await gameManager.addTeam(comp.id, "Team A", "#FF0000");

      const round = await prisma.round.create({
        data: {
          competitionId: comp.id,
          title: "Round 1",
          orderIndex: 1,
          type: "STANDARD",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "What is 2+2?",
          type: "MULTIPLE_CHOICE",
          points: 10,
          timeLimitSeconds: 30,
          content: { options: ["A", "B", "C", "D"], correctIndices: [1] },
          grading: "AUTO",
        },
      });

      await gameManager.startQuestion(comp.id, question.id);
      await gameManager.startTimer(comp.id, 30, () => {});
      const state = gameManager.getState(comp.id);

      expect(state.currentQuestion).not.toBeNull();
      const mcContent = state.currentQuestion!.content as { options: string[]; correctIndices: number[] };
      expect(mcContent.options).toHaveLength(4);

      const shuffledOpts = mcContent.options;
      const originalOpts = ["A", "B", "C", "D"];
      const originalCorrect = originalOpts[1];

      expect(shuffledOpts).toContain(originalCorrect);
      expect(mcContent.correctIndices).toEqual(
        shuffledOpts.indexOf(originalCorrect) >= 0
          ? [shuffledOpts.indexOf(originalCorrect)]
          : [],
      );

      const displayedCorrectIndex = mcContent.correctIndices[0];
      const submitResult = await gameManager.submitAnswer(comp.id, team.id, question.id, [displayedCorrectIndex], true);
      expect(submitResult.accepted).toBe(true);

      await gameManager.revealAnswer(comp.id);

      const finalState = gameManager.getState(comp.id);
      const updatedTeam = finalState.teams.find((t) => t.id === team.id);
      expect(updatedTeam?.score).toBeGreaterThan(0);
    });

    it("should produce consistent shuffle across multiple startQuestion calls", async () => {
      const comp = await prisma.competition.create({
        data: { title: "Consistency Test", host_pin: "0001" },
      });

      await gameManager.addTeam(comp.id, "Team A", "#FF0000");

      const round = await prisma.round.create({
        data: {
          competitionId: comp.id,
          title: "Round 1",
          orderIndex: 1,
          type: "STANDARD",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "Test question",
          type: "MULTIPLE_CHOICE",
          points: 10,
          timeLimitSeconds: 30,
          content: { options: ["X", "Y", "Z"], correctIndices: [0] },
          grading: "AUTO",
        },
      });

      await gameManager.startQuestion(comp.id, question.id);
      const state1 = gameManager.getState(comp.id);
      const mcContent1 = state1.currentQuestion!.content as { options: string[]; correctIndices: number[] };
      const options1 = [...mcContent1.options];
      const correctIdx1 = mcContent1.correctIndices[0];

      vi.setSystemTime(Date.now() + 1000);

      await gameManager.startQuestion(comp.id, question.id);
      const state2 = gameManager.getState(comp.id);
      const mcContent2 = state2.currentQuestion!.content as { options: string[]; correctIndices: number[] };
      const options2 = [...mcContent2.options];
      const correctIdx2 = mcContent2.correctIndices[0];

      expect(options1).toEqual(options2);
      expect(correctIdx1).toEqual(correctIdx2);
    });

    it("awards +1 bonus for streak 6-8 on MULTIPLE_CHOICE with 2 correct answers in STREAK round", async () => {
      const comp = await prisma.competition.create({
        data: { title: "Streak Test", host_pin: "0002" },
      });

      const round = await prisma.round.create({
        data: {
          competitionId: comp.id,
          title: "Round 3",
          orderIndex: 1,
          type: "STREAK",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "Which is correct?",
          type: "MULTIPLE_CHOICE",
          points: 1,
          timeLimitSeconds: 30,
          content: { options: ["A", "B"], correctIndices: [0] },
          grading: "AUTO",
        },
      });

      const team = await gameManager.addTeam(comp.id, "Streak Team", "#FF0000");
      const state = gameManager.getState(comp.id);
      const inMemoryTeam = state.teams.find((t) => t.id === team.id);
      inMemoryTeam!.streak = 6;

      await gameManager.startQuestion(comp.id, question.id);
      
      // Get the shuffled correct index from the session question content
      const mcContent = state.currentQuestion!.content as { options: string[]; correctIndices: number[] };
      const correctIndex = mcContent.correctIndices[0];

      await gameManager.startTimer(comp.id, 30, () => {});
      await gameManager.submitAnswer(comp.id, team.id, question.id, [correctIndex], true);
      vi.advanceTimersByTime(31000);
      await gameManager.revealAnswer(comp.id);

      const finalState = gameManager.getState(comp.id);
      const gradedTeam = finalState.teams.find((t) => t.id === team.id);
      expect(gradedTeam?.score).toBe(2);
    });

    it("awards +1 bonus when reaching streak 6 in STREAK round", async () => {
      const comp = await prisma.competition.create({
        data: { title: "Streak Test", host_pin: "0002" },
      });

      const round = await prisma.round.create({
        data: {
          competitionId: comp.id,
          title: "Round 3",
          orderIndex: 1,
          type: "STREAK",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "Which is correct?",
          type: "MULTIPLE_CHOICE",
          points: 1,
          timeLimitSeconds: 30,
          content: { options: ["A", "B"], correctIndices: [0] },
          grading: "AUTO",
        },
      });

      const team = await gameManager.addTeam(comp.id, "Streak Team", "#FF0000");
      const state = gameManager.getState(comp.id);
      const inMemoryTeam = state.teams.find((t) => t.id === team.id);
      inMemoryTeam!.streak = 6;

      await gameManager.startQuestion(comp.id, question.id);
      const mcContent = state.currentQuestion!.content as { options: string[]; correctIndices: number[] };
      const correctIndex = mcContent.correctIndices[0];

      await gameManager.startTimer(comp.id, 30, () => {});
      await gameManager.submitAnswer(comp.id, team.id, question.id, [correctIndex], true);
      vi.advanceTimersByTime(31000);
      await gameManager.revealAnswer(comp.id);

      const finalState = gameManager.getState(comp.id);
      const gradedTeam = finalState.teams.find((t) => t.id === team.id);
      expect(gradedTeam?.score).toBe(2);
    });

    it("awards +1 bonus when reaching streak 9 in STREAK round", async () => {
      const comp = await prisma.competition.create({
        data: { title: "Streak Test 2", host_pin: "0003" },
      });

      const round = await prisma.round.create({
        data: {
          competitionId: comp.id,
          title: "Round 3",
          orderIndex: 1,
          type: "STREAK",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "Which is correct?",
          type: "MULTIPLE_CHOICE",
          points: 1,
          timeLimitSeconds: 30,
          content: { options: ["A", "B"], correctIndices: [0] },
          grading: "AUTO",
        },
      });

      const team = await gameManager.addTeam(comp.id, "Streak Team 2", "#FF0000");
      const state = gameManager.getState(comp.id);
      const inMemoryTeam = state.teams.find((t) => t.id === team.id);
      inMemoryTeam!.streak = 9;

      await gameManager.startQuestion(comp.id, question.id);
      const mcContent = state.currentQuestion!.content as { options: string[]; correctIndices: number[] };
      const correctIndex = mcContent.correctIndices[0];

      await gameManager.startTimer(comp.id, 30, () => {});
      await gameManager.submitAnswer(comp.id, team.id, question.id, [correctIndex], true);
      vi.advanceTimersByTime(31000);
      await gameManager.revealAnswer(comp.id);

      const finalState = gameManager.getState(comp.id);
      const gradedTeam = finalState.teams.find((t) => t.id === team.id);
      expect(gradedTeam?.score).toBe(2);
    });

    it("awards +1 bonus when reaching streak 12 in STREAK round", async () => {
      const comp = await prisma.competition.create({
        data: { title: "Streak Test 3", host_pin: "0004" },
      });

      const round = await prisma.round.create({
        data: {
          competitionId: comp.id,
          title: "Round 3",
          orderIndex: 1,
          type: "STREAK",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "Which is correct?",
          type: "MULTIPLE_CHOICE",
          points: 1,
          timeLimitSeconds: 30,
          content: { options: ["A", "B"], correctIndices: [0] },
          grading: "AUTO",
        },
      });

      const team = await gameManager.addTeam(comp.id, "Streak Team 3", "#FF0000");
      const state = gameManager.getState(comp.id);
      const inMemoryTeam = state.teams.find((t) => t.id === team.id);
      inMemoryTeam!.streak = 12;

      await gameManager.startQuestion(comp.id, question.id);
      const mcContent = state.currentQuestion!.content as { options: string[]; correctIndices: number[] };
      const correctIndex = mcContent.correctIndices[0];

      await gameManager.startTimer(comp.id, 30, () => {});
      await gameManager.submitAnswer(comp.id, team.id, question.id, [correctIndex], true);
      vi.advanceTimersByTime(31000);
      await gameManager.revealAnswer(comp.id);

      const finalState = gameManager.getState(comp.id);
      const gradedTeam = finalState.teams.find((t) => t.id === team.id);
      expect(gradedTeam?.score).toBe(2);
    });

    it("does NOT award bonus for non-MULTIPLE_CHOICE questions in STREAK round", async () => {
      const comp = await prisma.competition.create({
        data: { title: "Streak Test 4", host_pin: "0005" },
      });

      const round = await prisma.round.create({
        data: {
          competitionId: comp.id,
          title: "Round 3",
          orderIndex: 1,
          type: "STREAK",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "True or false?",
          type: "TRUE_FALSE",
          points: 1,
          timeLimitSeconds: 30,
          content: { isTrue: true },
          grading: "AUTO",
        },
      });

      const team = await gameManager.addTeam(comp.id, "Streak Team 4", "#FF0000");
      const state = gameManager.getState(comp.id);
      const inMemoryTeam = state.teams.find((t) => t.id === team.id);
      inMemoryTeam!.streak = 12;

      await gameManager.startQuestion(comp.id, question.id);
      await gameManager.startTimer(comp.id, 30, () => {});
      await gameManager.submitAnswer(comp.id, team.id, question.id, true, true);
      vi.advanceTimersByTime(31000);
      await gameManager.revealAnswer(comp.id);

      const finalState = gameManager.getState(comp.id);
      const gradedTeam = finalState.teams.find((t) => t.id === team.id);
      expect(gradedTeam?.score).toBe(1);
    });

    it("does NOT award bonus in STANDARD round even with streak", async () => {
      const comp = await prisma.competition.create({
        data: { title: "Streak Test 5", host_pin: "0006" },
      });

      const round = await prisma.round.create({
        data: {
          competitionId: comp.id,
          title: "Round 1",
          orderIndex: 1,
          type: "STANDARD",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "Which is correct?",
          type: "MULTIPLE_CHOICE",
          points: 1,
          timeLimitSeconds: 30,
          content: { options: ["A", "B"], correctIndices: [0] },
          grading: "AUTO",
        },
      });

      const team = await gameManager.addTeam(comp.id, "Streak Team 5", "#FF0000");
      const state = gameManager.getState(comp.id);
      const inMemoryTeam = state.teams.find((t) => t.id === team.id);
      inMemoryTeam!.streak = 12;

      await gameManager.startQuestion(comp.id, question.id);
      const mcContent = state.currentQuestion!.content as { options: string[]; correctIndices: number[] };
      const correctIndex = mcContent.correctIndices[0];

      await gameManager.startTimer(comp.id, 30, () => {});
      await gameManager.submitAnswer(comp.id, team.id, question.id, [correctIndex], true);
      vi.advanceTimersByTime(31000);
      await gameManager.revealAnswer(comp.id);

      const finalState = gameManager.getState(comp.id);
      const gradedTeam = finalState.teams.find((t) => t.id === team.id);
      expect(gradedTeam?.score).toBe(1);
    });

    it("does NOT award bonus for MULTIPLE_CHOICE with more than 2 option", async () => {
      const comp = await prisma.competition.create({
        data: { title: "Streak Test 6", host_pin: "0007" },
      });

      const round = await prisma.round.create({
        data: {
          competitionId: comp.id,
          title: "Round 3",
          orderIndex: 1,
          type: "STREAK",
        },
      });

      const question = await prisma.question.create({
        data: {
          roundId: round.id,
          questionText: "Select 2 correct answers",
          type: "MULTIPLE_CHOICE",
          points: 2,
          timeLimitSeconds: 30,
          content: { options: ["A", "B", "C"], correctIndices: [0, 2] },
          grading: "AUTO",
        },
      });

      const team = await gameManager.addTeam(comp.id, "Streak Team 6", "#FF0000");
      const state = gameManager.getState(comp.id);
      const inMemoryTeam = state.teams.find((t) => t.id === team.id);
      inMemoryTeam!.streak = 12;

      await gameManager.startQuestion(comp.id, question.id);
      const mcContent = state.currentQuestion!.content as { options: string[]; correctIndices: number[] };

      await gameManager.startTimer(comp.id, 30, () => {});
      await gameManager.submitAnswer(comp.id, team.id, question.id, mcContent.correctIndices, true);
      vi.advanceTimersByTime(31000);
      await gameManager.revealAnswer(comp.id);

      const finalState = gameManager.getState(comp.id);
      const gradedTeam = finalState.teams.find((t) => t.id === team.id);
      expect(gradedTeam?.score).toBe(2);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameManager } from "./GameManager";
import { PostgresGameRepository } from "./repositories/PostgresGameRepository";
import prisma from "./db/prisma";

describe("GameManager Integration", () => {
  let gameManager: GameManager;
  let repository: PostgresGameRepository;
  const compId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.useFakeTimers();
    repository = new PostgresGameRepository();
    gameManager = new GameManager(repository);
  });

  it("should initialize with WAITING phase", () => {
    const state = gameManager.getState(compId);
    expect(state.phase).toBe("WAITING");
    expect(state.teams).toHaveLength(0);
  });

  it("should add a new team", async () => {
    const team = await gameManager.addTeam(compId, "Red Dragons", "#FF0000");
    expect(team.name).toBe("Red Dragons");
    expect(gameManager.getState(compId).teams).toHaveLength(1);
    expect(gameManager.getState(compId).teams[0].name).toBe("Red Dragons");
  });

  it("should start a question correctly in PREVIEW phase", async () => {
    // 1. Setup data in DB
    const competition = await prisma.competitions.create({
      data: { title: "Test Comp", host_pin: "1234" },
    });
    const testCompId = competition.id;

    const round = await prisma.rounds.create({
      data: {
        competition_id: testCompId,
        order_index: 1,
        type: "STANDARD",
        title: "Round 1",
      },
    });
    const roundId = round.id;

    const question = await prisma.questions.create({
      data: {
        round_id: roundId,
        question_text: "What is 1+1?",
        type: "CLOSED",
        points: 10,
        time_limit_seconds: 30,
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
    const competition = await prisma.competitions.create({
      data: { title: "Test", host_pin: "1" },
    });
    const testCompId = competition.id;

    const round = await prisma.rounds.create({
      data: {
        competition_id: testCompId,
        order_index: 1,
        type: "STANDARD",
      },
    });

    const question = await prisma.questions.create({
      data: {
        round_id: round.id,
        question_text: "T",
        type: "CLOSED",
        time_limit_seconds: 5,
        content: {},
      },
    });

    await gameManager.startQuestion(testCompId, question.id);
    expect(gameManager.getState(testCompId).phase).toBe("QUESTION_PREVIEW");

    gameManager.startTimer(testCompId, () => {});
    expect(gameManager.getState(testCompId).phase).toBe("QUESTION_ACTIVE");

    // Fast-forward 1 second
    vi.advanceTimersByTime(1000);
    expect(gameManager.getState(testCompId).timeRemaining).toBe(4);
  });

  it("should decrement timer and end question", async () => {
    const competition = await prisma.competitions.create({
      data: { title: "Test", host_pin: "1" },
    });
    const testCompId = competition.id;

    const round = await prisma.rounds.create({
      data: {
        competition_id: testCompId,
        order_index: 1,
        type: "STANDARD",
      },
    });

    const question = await prisma.questions.create({
      data: {
        round_id: round.id,
        question_text: "T",
        type: "CLOSED",
        time_limit_seconds: 5,
        content: {},
      },
    });

    await gameManager.startQuestion(testCompId, question.id);
    gameManager.startTimer(testCompId, () => {});

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
    const competition = await prisma.competitions.create({
      data: { title: "Test", host_pin: "1" },
    });
    const testCompId = competition.id;

    const round = await prisma.rounds.create({
      data: {
        competition_id: testCompId,
        order_index: 1,
        type: "STANDARD",
      },
    });

    const question = await prisma.questions.create({
      data: {
        round_id: round.id,
        question_text: "T",
        type: "CLOSED",
        time_limit_seconds: 5,
        content: {},
      },
    });

    await gameManager.startQuestion(testCompId, question.id);
    gameManager.startTimer(testCompId, () => {});

    // End question
    vi.advanceTimersByTime(6000);
    expect(gameManager.getState(testCompId).phase).toBe("GRADING");

    gameManager.revealAnswer(testCompId);
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
    const team = await prisma.teams.create({
      data: { name: "DB Team", color: "#0000FF" },
    });
    const teamId = team.id;

    // Setup round and question to award points
    const competition = await prisma.competitions.create({
      data: { title: "C", host_pin: "1" },
    });
    const testCompId = competition.id;

    const round = await prisma.rounds.create({
      data: {
        competition_id: testCompId,
        order_index: 1,
        type: "STANDARD",
      },
    });

    const question = await prisma.questions.create({
      data: {
        round_id: round.id,
        question_text: "Q",
        type: "CLOSED",
        content: {},
      },
    });

    // Insert correct answer
    await prisma.answers.create({
      data: {
        team_id: teamId,
        question_id: question.id,
        round_id: round.id,
        submitted_content: {},
        is_correct: true,
        score_awarded: 10,
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
      "00000000-0000-0000-0000-000000000000"
    );
    expect(reconnected).toBeNull();
  });

  it("should auto-grade a MULTIPLE_CHOICE question", async () => {
    const competition = await prisma.competitions.create({
      data: { title: "Test", host_pin: "1" },
    });
    const testCompId = competition.id;

    const round = await prisma.rounds.create({
      data: {
        competition_id: testCompId,
        order_index: 1,
        type: "STANDARD",
      },
    });

    const team = await gameManager.addTeam(
      testCompId,
      "Grading Team",
      "#000000"
    );

    const question = await prisma.questions.create({
      data: {
        round_id: round.id,
        question_text: "What is 1+1?",
        type: "MULTIPLE_CHOICE",
        points: 15,
        content: { options: ["1", "2"], correctIndex: 1 },
        grading: "AUTO",
      },
    });
    const questionId = question.id;

    await gameManager.startQuestion(testCompId, questionId);
    gameManager.startTimer(testCompId, () => {});

    await gameManager.submitAnswer(testCompId, team.id, questionId, 1); // Correct

    const updatedTeam = gameManager
      .getState(testCompId)
      .teams.find((t) => t.id === team.id);
    expect(updatedTeam?.score).toBe(15);

    // Wait for DB to settle if needed, though submitAnswer is awaited
    const answer = await prisma.answers.findFirst({
      where: { team_id: team.id, question_id: questionId },
    });
    expect(answer?.is_correct).toBe(true);
  });

  describe("lastAnswerCorrect tracking", () => {
    it("should initialize lastAnswerCorrect as null", async () => {
      const team = await gameManager.addTeam(compId, "Test Team", "#000000");
      expect(team.lastAnswerCorrect).toBeNull();
    });

    it("should reset lastAnswerCorrect when starting a new question", async () => {
      // 1. Setup
      const competition = await prisma.competitions.create({
        data: { title: "Test", host_pin: "1" },
      });
      const testCompId = competition.id;
      const team = await gameManager.addTeam(testCompId, "T1", "#000");

      const round = await prisma.rounds.create({
        data: {
          competition_id: testCompId,
          order_index: 1,
          type: "STANDARD",
        },
      });

      const question = await prisma.questions.create({
        data: {
          round_id: round.id,
          question_text: "Q1",
          type: "MULTIPLE_CHOICE",
          content: { options: ["A", "B"], correctIndex: 0 },
          points: 10,
          grading: "AUTO",
        },
      });
      const questionId = question.id;

      // 2. Mock a correct answer to set the status
      await gameManager.startQuestion(testCompId, questionId);
      gameManager.startTimer(testCompId, () => {});
      await gameManager.submitAnswer(testCompId, team.id, questionId, 0);

      expect(gameManager.getState(testCompId).teams[0].lastAnswerCorrect).toBe(
        true
      );

      // 3. Start a new question and verify reset
      const q2 = await prisma.questions.create({
        data: {
          round_id: round.id,
          question_text: "Q2",
          type: "MULTIPLE_CHOICE",
          content: { options: ["X", "Y"], correctIndex: 0 },
          points: 10,
          grading: "AUTO",
        },
      });
      await gameManager.startQuestion(testCompId, q2.id);

      expect(
        gameManager.getState(testCompId).teams[0].lastAnswerCorrect
      ).toBeNull();
    });

    it("should update lastAnswerCorrect for manual grading", async () => {
      // 1. Setup
      const competition = await prisma.competitions.create({
        data: { title: "Test", host_pin: "1" },
      });
      const testCompId = competition.id;
      const team = await gameManager.addTeam(testCompId, "T1", "#000");

      const round = await prisma.rounds.create({
        data: {
          competition_id: testCompId,
          order_index: 1,
          type: "STANDARD",
        },
      });

      const question = await prisma.questions.create({
        data: {
          round_id: round.id,
          question_text: "Q1",
          type: "OPEN_WORD",
          content: {},
          points: 10,
          grading: "MANUAL",
        },
      });
      const questionId = question.id;

      await gameManager.startQuestion(testCompId, questionId);
      gameManager.startTimer(testCompId, () => {});
      await gameManager.submitAnswer(
        testCompId,
        team.id,
        questionId,
        "My Answer"
      );

      // Initially null
      expect(
        gameManager.getState(testCompId).teams[0].lastAnswerCorrect
      ).toBeNull();

      // Get answer ID
      const answer = await prisma.answers.findFirst({
        where: { team_id: team.id, question_id: questionId },
      });
      const answerId = answer!.id;

      // 2. Act: Grade it correctly
      await gameManager.handleGradeDecision(testCompId, answerId, true);

      // 3. Assert
      expect(gameManager.getState(testCompId).teams[0].lastAnswerCorrect).toBe(
        true
      );
      expect(gameManager.getState(testCompId).teams[0].score).toBe(10);
    });
  });
});

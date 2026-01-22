import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameManager } from "./GameManager";
import { PostgresGameRepository } from "./repositories/PostgresGameRepository";
import prisma from "./db/prisma";
import { TimerService } from "./services/TimerService";
import { Logger } from "./utils/Logger";

describe("GameManager Next Flow", () => {
  let gameManager: GameManager;
  let repository: PostgresGameRepository;
  let compId: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    repository = new PostgresGameRepository();
    const timerService = new TimerService();
    const logger = new Logger("NextFlowTest");
    gameManager = new GameManager(repository, timerService, logger);

    const competition = await prisma.competition.create({
      data: { title: "Next Flow Comp", host_pin: "1234" },
    });
    compId = competition.id;
  });

  it("should follow the full game flow using next()", async () => {
    // 1. Setup Rounds and Questions
    const round1 = await prisma.round.create({
      data: {
        competitionId: compId,
        orderIndex: 1,
        type: "STANDARD",
        title: "R1",
      },
    });
    const q1 = await prisma.question.create({
      data: {
        roundId: round1.id,
        questionText: "Q1",
        type: "MULTIPLE_CHOICE",
        content: { options: ["A", "B"], correctIndex: 0 },
        timeLimitSeconds: 10,
      },
    });

    const round2 = await prisma.round.create({
      data: {
        competitionId: compId,
        orderIndex: 2,
        type: "STANDARD",
        title: "R2",
      },
    });
    const q2 = await prisma.question.create({
      data: {
        roundId: round2.id,
        questionText: "Q2",
        type: "CLOSED",
        content: { options: ["Ans"] },
        timeLimitSeconds: 10,
      },
    });

    const state0 = gameManager.getState(compId);
    expect(state0.phase).toBe("WAITING");

    // WAITING -> WELCOME
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("WELCOME");

    // WELCOME -> ROUND_START
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("ROUND_START");
    expect(gameManager.getState(compId).currentQuestion?.id).toBe(q1.id);

    // ROUND_START -> QUESTION_PREVIEW
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("QUESTION_PREVIEW");
    expect(gameManager.getState(compId).revealStep).toBe(0);

    // QUESTION_PREVIEW -> Reveal Options (MCQ has 2 options)
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).revealStep).toBe(1);
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).revealStep).toBe(2);

    // Reveal Step 2 -> QUESTION_ACTIVE (Start Timer)
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("QUESTION_ACTIVE");

    // QUESTION_ACTIVE -> GRADING (Force end)
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("GRADING");

    // GRADING -> REVEAL_ANSWER
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("REVEAL_ANSWER");

    // REVEAL_ANSWER -> ROUND_END (since next question is in a different round)
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("ROUND_END");

    // ROUND_END -> ROUND_START (next round)
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("ROUND_START");
    expect(gameManager.getState(compId).currentQuestion?.id).toBe(q2.id);

    // ROUND_START -> QUESTION_PREVIEW
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("QUESTION_PREVIEW");

    // QUESTION_PREVIEW -> QUESTION_ACTIVE (CLOSED question, no reveal steps)
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("QUESTION_ACTIVE");

    // QUESTION_ACTIVE -> GRADING
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("GRADING");

    // GRADING -> REVEAL_ANSWER
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("REVEAL_ANSWER");

    // REVEAL_ANSWER -> ROUND_END (last question)
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("ROUND_END");

    // ROUND_END -> LEADERBOARD
    await gameManager.next(compId, () => {});
    expect(gameManager.getState(compId).phase).toBe("LEADERBOARD");
  });
});

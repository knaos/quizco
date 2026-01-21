import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameManager } from "./GameManager";
import { PostgresGameRepository } from "./repositories/PostgresGameRepository";
import prisma from "./db/prisma";

describe("GameManager Reset Functionality", () => {
  let gameManager: GameManager;
  let repository: PostgresGameRepository;
  let compId: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    repository = new PostgresGameRepository();
    gameManager = new GameManager(repository);

    const competition = await prisma.competition.create({
      data: { title: "Reset Test Comp", host_pin: "1234" },
    });
    compId = competition.id;
  });

  it("should reset lastAnswer when starting a new question via startQuestion", async () => {
    const team = await gameManager.addTeam(compId, "Team 1", "#000");
    const round = await prisma.round.create({
      data: { competitionId: compId, orderIndex: 1, type: "STANDARD" },
    });
    const q1 = await prisma.question.create({
      data: {
        roundId: round.id,
        questionText: "Q1",
        type: "CLOSED",
        content: { options: ["A"] },
        points: 10,
        grading: "AUTO",
      },
    });

    await gameManager.startQuestion(compId, q1.id);
    await gameManager.setPhase(compId, "QUESTION_ACTIVE");
    await gameManager.submitAnswer(compId, team.id, q1.id, "A");

    expect(gameManager.getState(compId).teams[0].lastAnswer).toBe("A");

    const q2 = await prisma.question.create({
      data: {
        roundId: round.id,
        questionText: "Q2",
        type: "CLOSED",
        content: {},
        points: 10,
        grading: "AUTO",
      },
    });
    await gameManager.startQuestion(compId, q2.id);

    expect(gameManager.getState(compId).teams[0].lastAnswer).toBeNull();
    expect(gameManager.getState(compId).teams[0].lastAnswerCorrect).toBeNull();
  });

  it("should reset lastAnswer when transitioning from QUESTION_PREVIEW to ACTIVE via next()", async () => {
    const team = await gameManager.addTeam(compId, "Team 1", "#000");
    const round = await prisma.round.create({
      data: { competitionId: compId, orderIndex: 1, type: "STANDARD" },
    });
    const q1 = await prisma.question.create({
      data: {
        roundId: round.id,
        questionText: "Q1",
        type: "CLOSED",
        content: {},
        points: 10,
        grading: "AUTO",
        timeLimitSeconds: 30,
      },
    });

    // 1. Set up an existing answer from a previous state (simulated)
    await gameManager.startQuestion(compId, q1.id);
    const state = gameManager.getState(compId);
    state.teams[0].lastAnswer = "Previous Answer";
    state.teams[0].lastAnswerCorrect = true;

    // 2. Transition from PREVIEW to ACTIVE
    await gameManager.setPhase(compId, "QUESTION_PREVIEW");
    await gameManager.next(compId, () => {});

    // 3. Assert
    expect(gameManager.getState(compId).phase).toBe("QUESTION_ACTIVE");
    expect(gameManager.getState(compId).teams[0].lastAnswer).toBeNull();
    expect(gameManager.getState(compId).teams[0].lastAnswerCorrect).toBeNull();
  });

  it("should reset lastAnswer when transitioning from ROUND_END to ROUND_START via next()", async () => {
    const team = await gameManager.addTeam(compId, "Team 1", "#000");
    const round1 = await prisma.round.create({
      data: { competitionId: compId, orderIndex: 1, type: "STANDARD" },
    });
    const round2 = await prisma.round.create({
      data: { competitionId: compId, orderIndex: 2, type: "STANDARD" },
    });
    const q1 = await prisma.question.create({
      data: {
        roundId: round1.id,
        questionText: "Q1",
        type: "CLOSED",
        content: { options: ["A"] },
      },
    });
    const q2 = await prisma.question.create({
      data: {
        roundId: round2.id,
        questionText: "Q2",
        type: "CLOSED",
        content: { options: ["B"] },
      },
    });

    // 1. Submit answer for Q1
    await gameManager.startQuestion(compId, q1.id);
    await gameManager.setPhase(compId, "QUESTION_ACTIVE");
    await gameManager.submitAnswer(compId, team.id, q1.id, "A");
    expect(gameManager.getState(compId).teams[0].lastAnswer).toBe("A");

    // 2. Move to ROUND_END phase
    await gameManager.setPhase(compId, "ROUND_END");

    // 3. Transition to next round (ROUND_START)
    await gameManager.next(compId, () => {});

    // 4. Assert
    expect(gameManager.getState(compId).phase).toBe("ROUND_START");
    expect(gameManager.getState(compId).teams[0].lastAnswer).toBeNull();
    expect(gameManager.getState(compId).teams[0].lastAnswerCorrect).toBeNull();
  });
});

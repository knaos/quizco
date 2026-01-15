import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameManager } from "./GameManager";
import pool from "./db";

describe("GameManager Integration", () => {
  let gameManager: GameManager;

  beforeEach(() => {
    vi.useFakeTimers();
    gameManager = new GameManager();
  });

  it("should initialize with WAITING phase", () => {
    const state = gameManager.getState();
    expect(state.phase).toBe("WAITING");
    expect(state.teams).toHaveLength(0);
  });

  it("should add a new team", () => {
    const team = gameManager.addTeam("Red Dragons", "#FF0000");
    expect(team.name).toBe("Red Dragons");
    expect(gameManager.getState().teams).toHaveLength(1);
    expect(gameManager.getState().teams[0].name).toBe("Red Dragons");
  });

  it("should start a question correctly in PREVIEW phase", async () => {
    // 1. Setup data in DB
    const competitionRes = await pool.query(
      "INSERT INTO competitions (title, host_pin) VALUES ($1, $2) RETURNING id",
      ["Test Comp", "1234"]
    );
    const compId = competitionRes.rows[0].id;

    const roundRes = await pool.query(
      "INSERT INTO rounds (competition_id, order_index, type, title) VALUES ($1, $2, $3, $4) RETURNING id",
      [compId, 1, "STANDARD", "Round 1"]
    );
    const roundId = roundRes.rows[0].id;

    const questionRes = await pool.query(
      "INSERT INTO questions (round_id, question_text, type, points, time_limit_seconds, content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [roundId, "What is 1+1?", "CLOSED", 10, 30, { answer: "2" }]
    );
    const questionId = questionRes.rows[0].id;

    // 2. Act
    await gameManager.startQuestion(questionId);

    // 3. Assert
    const state = gameManager.getState();
    expect(state.phase).toBe("QUESTION_PREVIEW");
    expect(state.currentQuestion?.id).toBe(questionId);
    expect(state.timeRemaining).toBe(30);
  });

  it("should transition from PREVIEW to ACTIVE when timer starts", async () => {
    const competitionRes = await pool.query(
      "INSERT INTO competitions (title, host_pin) VALUES ($1, $2) RETURNING id",
      ["Test", "1"]
    );
    const roundRes = await pool.query(
      "INSERT INTO rounds (competition_id, order_index, type) VALUES ($1, $2, $3) RETURNING id",
      [competitionRes.rows[0].id, 1, "STANDARD"]
    );
    const qRes = await pool.query(
      "INSERT INTO questions (round_id, question_text, type, time_limit_seconds, content) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [roundRes.rows[0].id, "T", "CLOSED", 5, {}]
    );

    await gameManager.startQuestion(qRes.rows[0].id);
    expect(gameManager.getState().phase).toBe("QUESTION_PREVIEW");

    gameManager.startTimer();
    expect(gameManager.getState().phase).toBe("QUESTION_ACTIVE");

    // Fast-forward 1 second
    vi.advanceTimersByTime(1000);
    expect(gameManager.getState().timeRemaining).toBe(4);
  });

  it("should decrement timer and end question", async () => {
    const competitionRes = await pool.query(
      "INSERT INTO competitions (title, host_pin) VALUES ($1, $2) RETURNING id",
      ["Test", "1"]
    );
    const roundRes = await pool.query(
      "INSERT INTO rounds (competition_id, order_index, type) VALUES ($1, $2, $3) RETURNING id",
      [competitionRes.rows[0].id, 1, "STANDARD"]
    );
    const qRes = await pool.query(
      "INSERT INTO questions (round_id, question_text, type, time_limit_seconds, content) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [roundRes.rows[0].id, "T", "CLOSED", 5, {}]
    );

    await gameManager.startQuestion(qRes.rows[0].id);
    gameManager.startTimer();

    // Fast-forward 1 second
    vi.advanceTimersByTime(1000);
    expect(gameManager.getState().timeRemaining).toBe(4);

    // Fast-forward to end
    vi.advanceTimersByTime(4000);
    expect(gameManager.getState().timeRemaining).toBe(0);

    // One more tick to trigger the phase change
    vi.advanceTimersByTime(1000);
    expect(gameManager.getState().phase).toBe("GRADING");
  });

  it("should reveal answer after question ends", async () => {
    const competitionRes = await pool.query(
      "INSERT INTO competitions (title, host_pin) VALUES ($1, $2) RETURNING id",
      ["Test", "1"]
    );
    const roundRes = await pool.query(
      "INSERT INTO rounds (competition_id, order_index, type) VALUES ($1, $2, $3) RETURNING id",
      [competitionRes.rows[0].id, 1, "STANDARD"]
    );
    const qRes = await pool.query(
      "INSERT INTO questions (round_id, question_text, type, time_limit_seconds, content) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [roundRes.rows[0].id, "T", "CLOSED", 5, {}]
    );

    await gameManager.startQuestion(qRes.rows[0].id);
    gameManager.startTimer();

    // End question
    vi.advanceTimersByTime(6000);
    expect(gameManager.getState().phase).toBe("GRADING");

    gameManager.revealAnswer();
    expect(gameManager.getState().phase).toBe("REVEAL_ANSWER");
  });
});

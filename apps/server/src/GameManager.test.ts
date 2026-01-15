import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameManager } from "./GameManager";
import pool from "./db";

describe("GameManager Integration", () => {
  let gameManager: GameManager;
  const compId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.useFakeTimers();
    gameManager = new GameManager();
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
    const competitionRes = await pool.query(
      "INSERT INTO competitions (title, host_pin) VALUES ($1, $2) RETURNING id",
      ["Test Comp", "1234"]
    );
    const testCompId = competitionRes.rows[0].id;

    const roundRes = await pool.query(
      "INSERT INTO rounds (competition_id, order_index, type, title) VALUES ($1, $2, $3, $4) RETURNING id",
      [testCompId, 1, "STANDARD", "Round 1"]
    );
    const roundId = roundRes.rows[0].id;

    const questionRes = await pool.query(
      "INSERT INTO questions (round_id, question_text, type, points, time_limit_seconds, content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [roundId, "What is 1+1?", "CLOSED", 10, 30, { answer: "2" }]
    );
    const questionId = questionRes.rows[0].id;

    // 2. Act
    await gameManager.startQuestion(testCompId, questionId);

    // 3. Assert
    const state = gameManager.getState(testCompId);
    expect(state.phase).toBe("QUESTION_PREVIEW");
    expect(state.currentQuestion?.id).toBe(questionId);
    expect(state.timeRemaining).toBe(30);
  });

  it("should transition from PREVIEW to ACTIVE when timer starts", async () => {
    const competitionRes = await pool.query(
      "INSERT INTO competitions (title, host_pin) VALUES ($1, $2) RETURNING id",
      ["Test", "1"]
    );
    const testCompId = competitionRes.rows[0].id;
    const roundRes = await pool.query(
      "INSERT INTO rounds (competition_id, order_index, type) VALUES ($1, $2, $3) RETURNING id",
      [testCompId, 1, "STANDARD"]
    );
    const qRes = await pool.query(
      "INSERT INTO questions (round_id, question_text, type, time_limit_seconds, content) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [roundRes.rows[0].id, "T", "CLOSED", 5, {}]
    );

    await gameManager.startQuestion(testCompId, qRes.rows[0].id);
    expect(gameManager.getState(testCompId).phase).toBe("QUESTION_PREVIEW");

    gameManager.startTimer(testCompId, () => {});
    expect(gameManager.getState(testCompId).phase).toBe("QUESTION_ACTIVE");

    // Fast-forward 1 second
    vi.advanceTimersByTime(1000);
    expect(gameManager.getState(testCompId).timeRemaining).toBe(4);
  });

  it("should decrement timer and end question", async () => {
    const competitionRes = await pool.query(
      "INSERT INTO competitions (title, host_pin) VALUES ($1, $2) RETURNING id",
      ["Test", "1"]
    );
    const testCompId = competitionRes.rows[0].id;
    const roundRes = await pool.query(
      "INSERT INTO rounds (competition_id, order_index, type) VALUES ($1, $2, $3) RETURNING id",
      [testCompId, 1, "STANDARD"]
    );
    const qRes = await pool.query(
      "INSERT INTO questions (round_id, question_text, type, time_limit_seconds, content) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [roundRes.rows[0].id, "T", "CLOSED", 5, {}]
    );

    await gameManager.startQuestion(testCompId, qRes.rows[0].id);
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
    const competitionRes = await pool.query(
      "INSERT INTO competitions (title, host_pin) VALUES ($1, $2) RETURNING id",
      ["Test", "1"]
    );
    const testCompId = competitionRes.rows[0].id;
    const roundRes = await pool.query(
      "INSERT INTO rounds (competition_id, order_index, type) VALUES ($1, $2, $3) RETURNING id",
      [testCompId, 1, "STANDARD"]
    );
    const qRes = await pool.query(
      "INSERT INTO questions (round_id, question_text, type, time_limit_seconds, content) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [roundRes.rows[0].id, "T", "CLOSED", 5, {}]
    );

    await gameManager.startQuestion(testCompId, qRes.rows[0].id);
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
    const teamRes = await pool.query(
      "INSERT INTO teams (name, color) VALUES ($1, $2) RETURNING id",
      ["DB Team", "#0000FF"]
    );
    const teamId = teamRes.rows[0].id;

    // Setup round and question to award points
    const compRes = await pool.query(
      "INSERT INTO competitions (title, host_pin) VALUES ('C', '1') RETURNING id"
    );
    const testCompId = compRes.rows[0].id;
    const roundRes = await pool.query(
      "INSERT INTO rounds (competition_id, order_index, type) VALUES ($1, 1, 'STANDARD') RETURNING id",
      [testCompId]
    );
    const qRes = await pool.query(
      "INSERT INTO questions (round_id, question_text, type, content) VALUES ($1, 'Q', 'CLOSED', '{}') RETURNING id",
      [roundRes.rows[0].id]
    );

    // Insert correct answer
    await pool.query(
      "INSERT INTO answers (team_id, question_id, round_id, submitted_content, is_correct, score_awarded) VALUES ($1, $2, $3, '{}', true, 10)",
      [teamId, qRes.rows[0].id, roundRes.rows[0].id]
    );

    // 2. Act: Reconnect with a fresh GameManager (simulating server restart)
    const freshManager = new GameManager();
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
    const competitionRes = await pool.query(
      "INSERT INTO competitions (title, host_pin) VALUES ($1, $2) RETURNING id",
      ["Test", "1"]
    );
    const testCompId = competitionRes.rows[0].id;
    const team = await gameManager.addTeam(
      testCompId,
      "Grading Team",
      "#000000"
    );

    const roundRes = await pool.query(
      "INSERT INTO rounds (competition_id, order_index, type) VALUES ($1, 1, 'STANDARD') RETURNING id",
      [testCompId]
    );

    const res = await pool.query(
      "INSERT INTO questions (round_id, question_text, type, points, content, grading) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [
        roundRes.rows[0].id,
        "What is 1+1?",
        "MULTIPLE_CHOICE",
        15,
        JSON.stringify({ options: ["1", "2"], correctIndex: 1 }),
        "AUTO",
      ]
    );
    const questionId = res.rows[0].id;

    await gameManager.startQuestion(testCompId, questionId);
    gameManager.startTimer(testCompId, () => {});

    await gameManager.submitAnswer(testCompId, team.id, questionId, 1); // Correct

    const updatedTeam = gameManager
      .getState(testCompId)
      .teams.find((t) => t.id === team.id);
    expect(updatedTeam?.score).toBe(15);

    const answerRes = await pool.query(
      "SELECT is_correct FROM answers WHERE team_id = $1 AND question_id = $2",
      [team.id, questionId]
    );
    expect(answerRes.rows[0].is_correct).toBe(true);
  });
});

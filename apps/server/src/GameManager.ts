import { GameState, Team, Question, GamePhase } from "@quizco/shared";
import { query } from "./db";

export class GameManager {
  private state: GameState = {
    phase: "WAITING",
    currentQuestion: null,
    timeRemaining: 0,
    teams: [],
  };

  private timer: NodeJS.Timeout | null = null;

  constructor() {}

  public getState(): GameState {
    return this.state;
  }

  public async addTeam(name: string, color: string): Promise<Team> {
    const existingTeam = this.state.teams.find((t) => t.name === name);
    if (existingTeam) return existingTeam;

    // Persist team to DB and get UUID
    const res = await query(
      "INSERT INTO teams (name, color) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color RETURNING id, name, color",
      [name, color]
    );

    const dbTeam = res.rows[0];

    const newTeam: Team = {
      id: dbTeam.id,
      name: dbTeam.name,
      color: dbTeam.color,
      score: 0,
    };
    this.state.teams.push(newTeam);
    return newTeam;
  }

  public async startQuestion(questionId: string) {
    const res = await query("SELECT * FROM questions WHERE id = $1", [
      questionId,
    ]);
    if (res.rows.length === 0) return;

    const question = res.rows[0] as Question;
    this.state.currentQuestion = question;
    this.state.phase = "QUESTION_PREVIEW";
    this.state.timeRemaining = question.time_limit_seconds;

    if (this.timer) clearInterval(this.timer);
  }

  public startTimer() {
    if (this.state.phase !== "QUESTION_PREVIEW") return;
    this.state.phase = "QUESTION_ACTIVE";

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.state.timeRemaining > 0) {
        this.state.timeRemaining -= 1;
      } else {
        this.endQuestion();
      }
    }, 1000);
  }

  public revealAnswer() {
    if (
      this.state.phase !== "GRADING" &&
      this.state.phase !== "QUESTION_ACTIVE"
    )
      return;
    if (this.timer) clearInterval(this.timer);
    this.state.phase = "REVEAL_ANSWER";
  }

  private endQuestion() {
    if (this.timer) clearInterval(this.timer);
    this.state.phase = "GRADING";
    // In a real app, we might trigger auto-grading here
  }

  public async submitAnswer(teamId: string, questionId: string, answer: any) {
    if (this.state.phase !== "QUESTION_ACTIVE") return;
    if (this.state.currentQuestion?.id !== questionId) return;

    // Store in DB
    await query(
      "INSERT INTO answers (team_id, question_id, round_id, submitted_content) VALUES ($1, $2, $3, $4)",
      [
        teamId,
        questionId,
        this.state.currentQuestion.round_id,
        JSON.stringify(answer),
      ]
    );

    // Check if all teams have submitted
    const submittedRes = await query(
      "SELECT COUNT(DISTINCT team_id) FROM answers WHERE question_id = $1",
      [questionId]
    );
    const submittedCount = parseInt(submittedRes.rows[0].count);

    if (
      submittedCount >= this.state.teams.length &&
      this.state.teams.length > 0
    ) {
      this.endQuestion();
    }
  }

  public setPhase(phase: GamePhase) {
    this.state.phase = phase;
  }

  public async getAllQuestions() {
    return query("SELECT * FROM questions ORDER BY created_at");
  }

  public async reconnectTeam(teamId: string): Promise<Team | null> {
    const existingTeam = this.state.teams.find((t) => t.id === teamId);
    if (existingTeam) return existingTeam;

    // Check DB if not in memory (e.g. server restart)
    const res = await query("SELECT * FROM teams WHERE id = $1", [teamId]);
    if (res.rows.length === 0) return null;

    const dbTeam = res.rows[0];

    // Restore score from leaderboard view
    const scoreRes = await query(
      "SELECT total_score FROM leaderboard WHERE team_id = $1",
      [teamId]
    );
    const score = scoreRes.rows[0] ? parseInt(scoreRes.rows[0].total_score) : 0;

    const restoredTeam: Team = {
      id: dbTeam.id,
      name: dbTeam.name,
      color: dbTeam.color,
      score,
    };
    this.state.teams.push(restoredTeam);
    return restoredTeam;
  }
}

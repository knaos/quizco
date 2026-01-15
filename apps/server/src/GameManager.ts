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

  public addTeam(name: string, color: string): Team {
    const existingTeam = this.state.teams.find((t) => t.name === name);
    if (existingTeam) return existingTeam;

    const newTeam: Team = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      color,
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
    this.state.phase = "QUESTION_ACTIVE";
    this.state.timeRemaining = question.time_limit_seconds;

    this.startTimer();
  }

  private startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.state.timeRemaining > 0) {
        this.state.timeRemaining -= 1;
      } else {
        this.endQuestion();
      }
    }, 1000);
  }

  private endQuestion() {
    if (this.timer) clearInterval(this.timer);
    this.state.phase = "GRADING";
    // In a real app, we might trigger auto-grading here
  }

  public submitAnswer(teamId: string, questionId: string, answer: any) {
    if (this.state.phase !== "QUESTION_ACTIVE") return;
    if (this.state.currentQuestion?.id !== questionId) return;

    // Store in DB
    query(
      "INSERT INTO answers (team_id, question_id, round_id, submitted_content) VALUES ($1, $2, $3, $4)",
      [
        teamId,
        questionId,
        this.state.currentQuestion.round_id,
        JSON.stringify(answer),
      ]
    );
  }

  public setPhase(phase: GamePhase) {
    this.state.phase = phase;
  }

  public async getAllQuestions() {
    return query("SELECT * FROM questions ORDER BY created_at");
  }
}

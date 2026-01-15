import { GameState, Team, Question, GamePhase } from "@quizco/shared";
import { query } from "./db";

export class GameManager {
  private sessions: Map<string, GameState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {}

  private getOrCreateSession(competitionId: string): GameState {
    if (!this.sessions.has(competitionId)) {
      this.sessions.set(competitionId, {
        phase: "WAITING",
        currentQuestion: null,
        timeRemaining: 0,
        teams: [],
      });
    }
    return this.sessions.get(competitionId)!;
  }

  public getState(competitionId: string): GameState {
    return this.getOrCreateSession(competitionId);
  }

  public async addTeam(
    competitionId: string,
    name: string,
    color: string
  ): Promise<Team> {
    const session = this.getOrCreateSession(competitionId);
    const existingTeam = session.teams.find((t) => t.name === name);
    if (existingTeam) return existingTeam;

    // Persist team to DB and get UUID
    const res = await query(
      "INSERT INTO teams (name, color) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color RETURNING id, name, color",
      [name, color]
    );

    const dbTeam = res.rows[0];

    // Get current score for this competition if they are joining/rejoining
    const score = await this.getTeamScoreForCompetition(
      competitionId,
      dbTeam.id
    );

    const newTeam: Team = {
      id: dbTeam.id,
      name: dbTeam.name,
      color: dbTeam.color,
      score: score,
    };
    session.teams.push(newTeam);
    return newTeam;
  }

  private async getTeamScoreForCompetition(
    competitionId: string,
    teamId: string
  ): Promise<number> {
    const res = await query(
      `SELECT COALESCE(SUM(a.score_awarded), 0) as total_score 
       FROM answers a 
       JOIN rounds r ON a.round_id = r.id 
       WHERE r.competition_id = $1 AND a.team_id = $2 AND a.is_correct = TRUE`,
      [competitionId, teamId]
    );
    return parseInt(res.rows[0]?.total_score || "0");
  }

  public async startQuestion(competitionId: string, questionId: string) {
    const session = this.getOrCreateSession(competitionId);
    const res = await query("SELECT * FROM questions WHERE id = $1", [
      questionId,
    ]);
    if (res.rows.length === 0) return;

    const question = res.rows[0] as Question;
    session.currentQuestion = question;
    session.phase = "QUESTION_PREVIEW";
    session.timeRemaining = question.time_limit_seconds;

    const existingTimer = this.timers.get(competitionId);
    if (existingTimer) clearInterval(existingTimer);
  }

  public startTimer(competitionId: string, onTick: (state: GameState) => void) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_PREVIEW") return;
    session.phase = "QUESTION_ACTIVE";

    const existingTimer = this.timers.get(competitionId);
    if (existingTimer) clearInterval(existingTimer);

    const timer = setInterval(() => {
      if (session.timeRemaining > 0) {
        session.timeRemaining -= 1;
        onTick(session);
      } else {
        this.endQuestion(competitionId);
        onTick(session);
      }
    }, 1000);
    this.timers.set(competitionId, timer);
  }

  public revealAnswer(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "GRADING" && session.phase !== "QUESTION_ACTIVE")
      return;

    const timer = this.timers.get(competitionId);
    if (timer) clearInterval(timer);
    session.phase = "REVEAL_ANSWER";
  }

  private endQuestion(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    const timer = this.timers.get(competitionId);
    if (timer) clearInterval(timer);
    session.phase = "GRADING";
  }

  public async submitAnswer(
    competitionId: string,
    teamId: string,
    questionId: string,
    answer: any
  ) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_ACTIVE") return;
    if (session.currentQuestion?.id !== questionId) return;

    let isCorrect = null;
    let scoreAwarded = 0;

    // Auto-grading for MCQ and CLOSED
    if (session.currentQuestion.grading === "AUTO") {
      const q = session.currentQuestion;
      if (q.type === "MULTIPLE_CHOICE") {
        isCorrect = answer === q.content.correctIndex;
      } else if (q.type === "CLOSED") {
        // Simple case-insensitive match for CLOSED
        const correctAnswers = q.content.options.map((o: string) =>
          o.toLowerCase().trim()
        );
        const submittedAnswer = String(answer).toLowerCase().trim();
        isCorrect = correctAnswers.includes(submittedAnswer);
      }
      scoreAwarded = isCorrect ? q.points : 0;
    }

    // Store in DB
    await query(
      "INSERT INTO answers (team_id, question_id, round_id, submitted_content, is_correct, score_awarded) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        teamId,
        questionId,
        session.currentQuestion.round_id,
        JSON.stringify(answer),
        isCorrect,
        scoreAwarded,
      ]
    );

    // Update score in memory immediately for auto-graded questions
    if (isCorrect !== null) {
      await this.refreshTeamScores(competitionId);
    }

    // Check if all teams have submitted
    const submittedRes = await query(
      "SELECT COUNT(DISTINCT team_id) FROM answers WHERE question_id = $1",
      [questionId]
    );
    const submittedCount = parseInt(submittedRes.rows[0].count);

    if (submittedCount >= session.teams.length && session.teams.length > 0) {
      this.endQuestion(competitionId);
    }
  }

  public async handleGradeDecision(
    competitionId: string,
    answerId: string,
    correct: boolean
  ) {
    // Get the answer details
    const res = await query("SELECT * FROM answers WHERE id = $1", [answerId]);
    if (res.rows.length === 0) return;
    const answer = res.rows[0];

    // Get question points
    const qRes = await query("SELECT points FROM questions WHERE id = $1", [
      answer.question_id,
    ]);
    const points = qRes.rows[0]?.points || 0;

    const scoreAwarded = correct ? points : 0;

    // Update DB
    await query(
      "UPDATE answers SET is_correct = $1, score_awarded = $2 WHERE id = $3",
      [correct, scoreAwarded, answerId]
    );

    // Refresh scores
    await this.refreshTeamScores(competitionId);
  }

  public async refreshTeamScores(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    for (const team of session.teams) {
      team.score = await this.getTeamScoreForCompetition(
        competitionId,
        team.id
      );
    }
  }

  public setPhase(competitionId: string, phase: GamePhase) {
    const session = this.getOrCreateSession(competitionId);
    session.phase = phase;
  }

  public async getAllQuestions() {
    return query("SELECT * FROM questions ORDER BY created_at");
  }

  public async getQuestionsForCompetition(competitionId: string) {
    return query(
      `SELECT q.* FROM questions q 
         JOIN rounds r ON q.round_id = r.id 
         WHERE r.competition_id = $1 
         ORDER BY r.order_index, q.created_at`,
      [competitionId]
    );
  }

  public async reconnectTeam(
    competitionId: string,
    teamId: string
  ): Promise<Team | null> {
    const session = this.getOrCreateSession(competitionId);
    const existingTeam = session.teams.find((t) => t.id === teamId);
    if (existingTeam) return existingTeam;

    // Check DB if not in memory (e.g. server restart)
    const res = await query("SELECT * FROM teams WHERE id = $1", [teamId]);
    if (res.rows.length === 0) return null;

    const dbTeam = res.rows[0];
    const score = await this.getTeamScoreForCompetition(competitionId, teamId);

    const restoredTeam: Team = {
      id: dbTeam.id,
      name: dbTeam.name,
      color: dbTeam.color,
      score,
    };
    session.teams.push(restoredTeam);
    return restoredTeam;
  }
}

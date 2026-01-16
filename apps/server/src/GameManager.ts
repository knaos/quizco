import { GameState, Team, Question, GamePhase } from "@quizco/shared";
import { IGameRepository } from "./repositories/IGameRepository";

export class GameManager {
  private sessions: Map<string, GameState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private repository: IGameRepository) {}

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

    const newTeam = await this.repository.getOrCreateTeam(
      competitionId,
      name,
      color
    );
    session.teams.push(newTeam);
    return newTeam;
  }

  public async startQuestion(competitionId: string, questionId: string) {
    const session = this.getOrCreateSession(competitionId);
    const question = await this.repository.getQuestion(questionId);
    if (!question) return;

    session.currentQuestion = question;
    session.phase = "QUESTION_PREVIEW";
    session.timeRemaining = question.time_limit_seconds;

    // Reset last answer status for all teams
    for (const team of session.teams) {
      team.lastAnswerCorrect = null;
    }

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
        const correctAnswers = q.content.options.map((o: string) =>
          o.toLowerCase().trim()
        );
        const submittedAnswer = String(answer).toLowerCase().trim();
        isCorrect = correctAnswers.includes(submittedAnswer);
      }
      scoreAwarded = isCorrect ? q.points : 0;
    }

    // Store in Repository
    await this.repository.saveAnswer(
      teamId,
      questionId,
      session.currentQuestion.round_id,
      answer,
      isCorrect,
      scoreAwarded
    );

    // Update score and status in memory immediately for auto-graded questions
    if (isCorrect !== null) {
      const team = session.teams.find((t) => t.id === teamId);
      if (team) {
        team.lastAnswerCorrect = isCorrect;
      }
      await this.refreshTeamScores(competitionId);
    }

    // Check if all teams have submitted
    const submittedCount = await this.repository.getSubmissionCount(questionId);

    if (submittedCount >= session.teams.length && session.teams.length > 0) {
      this.endQuestion(competitionId);
    }
  }

  public async handleGradeDecision(
    competitionId: string,
    answerId: string,
    correct: boolean
  ) {
    const session = this.getOrCreateSession(competitionId);

    const answer = await this.repository.getAnswer(answerId);
    if (!answer) return;

    const team = session.teams.find((t) => t.id === answer.team_id);
    if (team) {
      team.lastAnswerCorrect = correct;
    }

    const question = await this.repository.getQuestion(answer.question_id);
    const points = question?.points || 0;
    const scoreAwarded = correct ? points : 0;

    await this.repository.updateAnswerGrading(answerId, correct, scoreAwarded);
    await this.refreshTeamScores(competitionId);
  }

  public async refreshTeamScores(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    for (const team of session.teams) {
      team.score = await this.repository.getTeamScore(competitionId, team.id);
    }
  }

  public setPhase(competitionId: string, phase: GamePhase) {
    const session = this.getOrCreateSession(competitionId);
    session.phase = phase;
  }

  public async getAllQuestions() {
    return this.repository.getAllQuestions();
  }

  public async getQuestionsForCompetition(competitionId: string) {
    return this.repository.getQuestionsForCompetition(competitionId);
  }

  public async reconnectTeam(
    competitionId: string,
    teamId: string
  ): Promise<Team | null> {
    const session = this.getOrCreateSession(competitionId);
    const existingTeam = session.teams.find((t) => t.id === teamId);
    if (existingTeam) return existingTeam;

    const restoredTeam = await this.repository.reconnectTeam(
      competitionId,
      teamId
    );
    if (restoredTeam) {
      session.teams.push(restoredTeam);
    }
    return restoredTeam;
  }
}

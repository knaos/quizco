import {
  GameState,
  Team,
  Question,
  GamePhase,
  AnswerContent,
} from "@quizco/shared";
import { IGameRepository } from "./repositories/IGameRepository";
import { GradingService } from "./services/GradingService";
import { StatePersistenceService } from "./services/StatePersistenceService";

export class GameManager {
  private sessions: Map<string, GameState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private gradingService: GradingService;
  private persistenceService: StatePersistenceService;

  constructor(private repository: IGameRepository) {
    this.gradingService = new GradingService();
    this.persistenceService = new StatePersistenceService();
  }

  public async initialize() {
    this.sessions = await this.persistenceService.loadState();
  }

  private async saveState() {
    await this.persistenceService.saveState(this.sessions);
  }

  private getOrCreateSession(competitionId: string): GameState {
    if (!this.sessions.has(competitionId)) {
      this.sessions.set(competitionId, {
        phase: "WAITING",
        currentQuestion: null,
        timeRemaining: 0,
        teams: [],
        revealStep: 0,
      });
    }
    return this.sessions.get(competitionId)!;
  }

  /**
   * Updates the connection status of a team in a session.
   * Returns true if the status actually changed.
   */
  public updateTeamConnection(
    competitionId: string,
    teamId: string,
    isConnected: boolean
  ): boolean {
    const session = this.getOrCreateSession(competitionId);
    const team = session.teams.find((t) => t.id === teamId);
    if (team) {
      if (team.isConnected !== isConnected) {
        team.isConnected = isConnected;
        return true;
      }
    }
    return false;
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
    if (existingTeam) {
      existingTeam.isConnected = true;
      return existingTeam;
    }

    const newTeam = await this.repository.getOrCreateTeam(
      competitionId,
      name,
      color
    );

    // Double check by ID as well to prevent memory duplicates
    const existingById = session.teams.find((t) => t.id === newTeam.id);
    if (existingById) {
      existingById.isConnected = true;
      return existingById;
    }

    const teamWithStatus = { ...newTeam, isConnected: true };
    session.teams.push(teamWithStatus);
    await this.saveState();
    return teamWithStatus;
  }

  public async startQuestion(competitionId: string, questionId: string) {
    const session = this.getOrCreateSession(competitionId);
    const question = await this.repository.getQuestion(questionId);
    if (!question) return;

    // Deep clone to avoid mutating repository cache
    const sessionQuestion = JSON.parse(JSON.stringify(question));

    if (sessionQuestion.type === "CHRONOLOGY") {
      // Server-side shuffle: ensure everyone gets the same order
      sessionQuestion.content.items = this.shuffleArray(
        sessionQuestion.content.items
      );
    }

    session.currentQuestion = sessionQuestion;
    session.phase = "QUESTION_PREVIEW";
    session.timeRemaining = question.timeLimitSeconds;
    session.revealStep = 0;

    // Reset last answer status for all teams
    for (const team of session.teams) {
      team.lastAnswerCorrect = null;
      team.lastAnswer = null;
    }

    const existingTimer = this.timers.get(competitionId);
    if (existingTimer) clearInterval(existingTimer);

    await this.saveState();
  }

  public async startTimer(
    competitionId: string,
    durationSeconds: number,
    onTick: (state: GameState) => void
  ) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_PREVIEW") return;
    session.phase = "QUESTION_ACTIVE";
    session.timeRemaining = durationSeconds;

    const existingTimer = this.timers.get(competitionId);
    if (existingTimer) clearInterval(existingTimer);

    await this.saveState();

    const timer = setInterval(async () => {
      if (session.timeRemaining > 0) {
        session.timeRemaining -= 1;
        onTick(session);
      } else {
        await this.endQuestion(competitionId);
        onTick(session);
      }
    }, 1000);
    this.timers.set(competitionId, timer);
  }

  public async revealAnswer(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "GRADING" && session.phase !== "QUESTION_ACTIVE")
      return;

    const timer = this.timers.get(competitionId);
    if (timer) clearInterval(timer);
    session.phase = "REVEAL_ANSWER";
    await this.saveState();
  }

  private async endQuestion(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    const timer = this.timers.get(competitionId);
    if (timer) clearInterval(timer);
    session.phase = "GRADING";
    await this.saveState();
  }

  public async submitAnswer(
    competitionId: string,
    teamId: string,
    questionId: string,
    answer: AnswerContent
  ) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_ACTIVE") return;
    if (session.currentQuestion?.id !== questionId) return;

    // Use GradingService
    const gradingResult = this.gradingService.gradeAnswer(
      session.currentQuestion,
      answer
    );

    const isCorrect = gradingResult ? gradingResult.isCorrect : null;
    let scoreAwarded = gradingResult ? gradingResult.score : 0;

    const team = session.teams.find((t) => t.id === teamId);
    if (team && isCorrect !== null) {
      // Streak logic
      if (isCorrect) {
        team.streak = (team.streak || 0) + 1;

        // Apply bonus if in STREAK round
        const questions =
          await this.repository.getQuestionsForCompetition(competitionId);
        const questionData = questions.find((q) => q.id === questionId);
        const round = questionData?.round;

        if (round?.type === "STREAK") {
          let bonus = 0;
          if (team.streak >= 10) bonus = 3;
          else if (team.streak >= 7) bonus = 2;
          else if (team.streak >= 5) bonus = 1;

          scoreAwarded += bonus;
        }
      } else {
        team.streak = 0;
      }

      // Update streak in DB
      await this.repository.updateTeamStreak(teamId, team.streak);
    }

    // Store in Repository
    await this.repository.saveAnswer(
      teamId,
      questionId,
      session.currentQuestion.roundId,
      answer,
      isCorrect,
      scoreAwarded
    );

    // Update status in memory immediately
    if (team) {
      team.lastAnswer = answer;
      if (isCorrect !== null) {
        team.lastAnswerCorrect = isCorrect;
      }
    }

    if (isCorrect !== null) {
      await this.refreshTeamScores(competitionId);
    }

    await this.saveState();

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

    const teamId = answer.teamId || answer.team_id;
    const team = session.teams.find((t) => t.id === teamId);
    if (team) {
      team.lastAnswerCorrect = correct;
    }

    const questionId = answer.questionId || answer.question_id;
    const question = await this.repository.getQuestion(questionId);
    const points = question?.points || 0;
    const scoreAwarded = correct ? points : 0;

    await this.repository.updateAnswerGrading(answerId, correct, scoreAwarded);
    await this.refreshTeamScores(competitionId);
    await this.saveState();
  }

  public async refreshTeamScores(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    for (const team of session.teams) {
      team.score = await this.repository.getTeamScore(competitionId, team.id);
    }
  }

  public async setPhase(competitionId: string, phase: GamePhase) {
    const session = this.getOrCreateSession(competitionId);
    session.phase = phase;
    await this.saveState();
  }

  public async next(competitionId: string, onTick: (state: GameState) => void) {
    const session = this.getOrCreateSession(competitionId);
    const questions =
      await this.repository.getQuestionsForCompetition(competitionId);

    switch (session.phase) {
      case "WAITING":
        session.phase = "WELCOME";
        break;
      case "WELCOME":
        if (questions.length > 0) {
          session.phase = "ROUND_START";
          session.currentQuestion = questions[0];
          // We need to know which round we are in
          session.revealStep = 0; // reusing this for round index if needed? No, let's keep it simple.
        } else {
          session.phase = "LEADERBOARD";
        }
        break;
      case "ROUND_START":
        session.phase = "QUESTION_PREVIEW";
        session.revealStep = 0;
        break;
      case "QUESTION_PREVIEW":
        // Handle incremental reveal for MULTIPLE_CHOICE
        if (
          session.currentQuestion?.type === "MULTIPLE_CHOICE" &&
          session.revealStep < session.currentQuestion.content.options.length
        ) {
          session.revealStep += 1;
        } else {
          const duration = session.currentQuestion?.timeLimitSeconds ?? 30;
          await this.startTimer(competitionId, duration, onTick);
        }
        break;
      case "QUESTION_ACTIVE":
        // Force end question
        await this.endQuestion(competitionId);
        break;
      case "GRADING":
        await this.revealAnswer(competitionId);
        break;
      case "REVEAL_ANSWER": {
        const currentIndex = questions.findIndex(
          (q) => q.id === session.currentQuestion?.id
        );
        const nextQuestion = questions[currentIndex + 1];

        if (nextQuestion) {
          if (nextQuestion.roundId !== session.currentQuestion?.roundId) {
            session.phase = "ROUND_END";
          } else {
            await this.startQuestion(competitionId, nextQuestion.id);
          }
        } else {
          session.phase = "ROUND_END";
        }
        break;
      }
      case "ROUND_END": {
        const currentIndex = questions.findIndex(
          (q) => q.id === session.currentQuestion?.id
        );
        const nextQuestion = questions[currentIndex + 1];
        if (nextQuestion) {
          session.phase = "ROUND_START";
          session.currentQuestion = nextQuestion;
        } else {
          session.phase = "LEADERBOARD";
        }
        break;
      }
      case "LEADERBOARD":
        // Reset or stay?
        break;
    }

    await this.saveState();
  }

  public async getAllQuestions() {
    return this.repository.getAllQuestions();
  }

  public async getQuestionsForCompetition(competitionId: string) {
    return this.repository.getQuestionsForCompetition(competitionId);
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public async reconnectTeam(
    competitionId: string,
    teamId: string
  ): Promise<Team | null> {
    const session = this.getOrCreateSession(competitionId);
    const existingTeam = session.teams.find((t) => t.id === teamId);
    if (existingTeam) {
      existingTeam.isConnected = true;
      return existingTeam;
    }

    const restoredTeam = await this.repository.reconnectTeam(
      competitionId,
      teamId
    );
    if (restoredTeam) {
      // Check again to be safe against race conditions
      const doubleCheck = session.teams.find((t) => t.id === teamId);
      if (doubleCheck) {
        doubleCheck.isConnected = true;
        return doubleCheck;
      }

      const teamWithStatus = { ...restoredTeam, isConnected: true };
      session.teams.push(teamWithStatus);
      await this.saveState();
      return teamWithStatus;
    }
    return null;
  }
}

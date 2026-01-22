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
import { TimerService } from "./services/TimerService";
import { ILogger } from "./utils/Logger";

export class GameManager {
  private sessions: Map<string, GameState & { metadata?: any }> = new Map();
  private gradingService: GradingService;
  private persistenceService: StatePersistenceService;

  constructor(
    private repository: IGameRepository,
    private timerService: TimerService,
    private logger: ILogger,
  ) {
    this.gradingService = new GradingService();
    this.persistenceService = new StatePersistenceService();
  }

  public async initialize() {
    this.logger.info("Initializing GameManager...");
    this.sessions = await this.persistenceService.loadState();
    this.logger.info(`Loaded ${this.sessions.size} sessions from persistence.`);
  }

  private async saveState() {
    try {
      await this.persistenceService.saveState(this.sessions);
    } catch (error) {
      this.logger.error("Failed to save state", error);
    }
  }

  private getOrCreateSession(
    competitionId: string,
  ): GameState & { metadata?: any } {
    if (!this.sessions.has(competitionId)) {
      this.logger.info(
        `Creating new session for competition: ${competitionId}`,
      );
      this.sessions.set(competitionId, {
        phase: "WAITING",
        currentQuestion: null,
        timeRemaining: 0,
        teams: [],
        revealStep: 0,
        timerPaused: false,
        metadata: {},
      });
    }
    const session = this.sessions.get(competitionId)!;
    if (!session.metadata) session.metadata = {};
    return session;
  }

  /**
   * Updates the connection status of a team in a session.
   * Returns true if the status actually changed.
   */
  public updateTeamConnection(
    competitionId: string,
    teamId: string,
    isConnected: boolean,
  ): boolean {
    const session = this.getOrCreateSession(competitionId);
    const team = session.teams.find((t) => t.id === teamId);
    if (team) {
      if (team.isConnected !== isConnected) {
        team.isConnected = isConnected;
        this.logger.info(
          `Team ${team.name} (${teamId}) ${isConnected ? "connected" : "disconnected"} in ${competitionId}`,
        );
        return true;
      }
    } else {
      this.logger.warn(
        `Attempted to update connection for unknown team ${teamId} in ${competitionId}`,
      );
    }
    return false;
  }

  public getState(competitionId: string): GameState {
    return this.getOrCreateSession(competitionId);
  }

  public async addTeam(
    competitionId: string,
    name: string,
    color: string,
  ): Promise<Team> {
    this.logger.info(`Adding team ${name} to competition ${competitionId}`);
    const session = this.getOrCreateSession(competitionId);
    const existingTeam = session.teams.find((t) => t.name === name);
    if (existingTeam) {
      this.logger.info(`Team ${name} already exists in session, reconnecting.`);
      existingTeam.isConnected = true;
      return existingTeam;
    }

    const newTeam = await this.repository.getOrCreateTeam(
      competitionId,
      name,
      color,
    );

    // Double check by ID as well to prevent memory duplicates
    const existingById = session.teams.find((t) => t.id === newTeam.id);
    if (existingById) {
      this.logger.info(
        `Team ${name} (${newTeam.id}) already exists in session by ID, reconnecting.`,
      );
      existingById.isConnected = true;
      return existingById;
    }

    const teamWithStatus = { ...newTeam, isConnected: true };
    session.teams.push(teamWithStatus);
    this.logger.info(`Team ${name} added to competition ${competitionId}`);
    await this.saveState();
    return teamWithStatus;
  }

  public async startQuestion(competitionId: string, questionId: string) {
    this.logger.info(`Starting question ${questionId} in ${competitionId}`);
    const session = this.getOrCreateSession(competitionId);
    const question = await this.repository.getQuestion(questionId);
    if (!question) {
      this.logger.error(`Question ${questionId} not found!`);
      return;
    }

    // Deep clone to avoid mutating repository cache
    const sessionQuestion = JSON.parse(JSON.stringify(question));

    if (sessionQuestion.type === "CHRONOLOGY") {
      // Server-side shuffle: ensure everyone gets the same order
      sessionQuestion.content.items = this.shuffleArray(
        sessionQuestion.content.items,
      );
    }

    session.currentQuestion = sessionQuestion;
    session.phase = "QUESTION_PREVIEW";
    session.timeRemaining = question.timeLimitSeconds;
    session.revealStep = 0;
    session.timerPaused = false;
    session.metadata = {}; // Clear metadata for new question

    // Reset last answer status for all teams
    for (const team of session.teams) {
      team.lastAnswerCorrect = null;
      team.lastAnswer = null;
    }

    this.timerService.stop(competitionId);

    await this.saveState();
  }

  public async startTimer(
    competitionId: string,
    durationSeconds: number,
    onTick: (state: GameState) => void,
  ) {
    this.logger.info(
      `Starting timer for ${competitionId}: ${durationSeconds}s`,
    );
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_PREVIEW") {
      this.logger.warn(
        `Cannot start timer: session ${competitionId} is in phase ${session.phase}, expected QUESTION_PREVIEW`,
      );
      return;
    }
    session.phase = "QUESTION_ACTIVE";
    session.timeRemaining = durationSeconds;
    session.timerPaused = false;

    this.timerService.stop(competitionId);

    await this.saveState();

    this.timerService.start(competitionId, durationSeconds, {
      onTick: async (remaining) => {
        if (session.timerPaused) return;
        session.timeRemaining = remaining;
        onTick(session);
      },
      onEnd: async () => {
        await this.endQuestion(competitionId);
        onTick(session);
      },
    });
  }

  public async pauseTimer(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_ACTIVE") return;
    session.timerPaused = true;
    await this.saveState();
  }

  public async resumeTimer(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_ACTIVE") return;
    session.timerPaused = false;
    await this.saveState();
  }

  public async revealAnswer(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "GRADING" && session.phase !== "QUESTION_ACTIVE")
      return;

    this.timerService.stop(competitionId);
    session.phase = "REVEAL_ANSWER";
    await this.saveState();
  }

  private async endQuestion(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    this.timerService.stop(competitionId);
    session.phase = "GRADING";
    session.timerPaused = false;
    await this.saveState();
  }

  public async submitAnswer(
    competitionId: string,
    teamId: string,
    questionId: string,
    answer: AnswerContent,
  ) {
    this.logger.info(
      `Received answer from team ${teamId} for question ${questionId} in ${competitionId}`,
    );
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_ACTIVE") {
      this.logger.warn(
        `Rejecting answer from team ${teamId}: session ${competitionId} is in phase ${session.phase}`,
      );
      return;
    }
    if (session.currentQuestion?.id !== questionId) {
      this.logger.warn(
        `Rejecting answer from team ${teamId}: current question is ${session.currentQuestion?.id}, but answer is for ${questionId}`,
      );
      return;
    }

    const usedJokers = session.metadata?.usedJokers?.has(teamId) || false;

    // Use GradingService
    const gradingResult = this.gradingService.gradeAnswer(
      session.currentQuestion,
      answer,
      { usedJokers },
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
      scoreAwarded,
    );

    // Update status in memory immediately
    if (team) {
      team.lastAnswer = answer;
      if (isCorrect !== null) {
        team.lastAnswerCorrect = isCorrect;
      }
    }

    if (isCorrect !== null) {
      this.logger.info(
        `Answer from team ${teamId} graded: ${isCorrect ? "CORRECT" : "INCORRECT"}, score awarded: ${scoreAwarded}`,
      );
      await this.refreshTeamScores(competitionId);
    }

    await this.saveState();

    // Check if all teams have submitted
    const submittedCount = await this.repository.getSubmissionCount(questionId);
    this.logger.debug(
      `Submissions for ${questionId}: ${submittedCount}/${session.teams.length}`,
    );

    if (submittedCount >= session.teams.length && session.teams.length > 0) {
      this.logger.info(
        `All teams submitted for ${questionId}. Ending question.`,
      );
      this.endQuestion(competitionId);
    }
  }

  public async handleJokerReveal(
    competitionId: string,
    teamId: string,
    questionId: string,
    io: any,
  ) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_ACTIVE") return;
    if (session.currentQuestion?.type !== "CROSSWORD") return;
    if (session.currentQuestion.id !== questionId) return;

    const team = session.teams.find((t) => t.id === teamId);
    if (!team) return;

    // Rule: Joker costs 2 points
    if (team.score < 2) {
      io.to(competitionId).emit("JOKER_ERROR", {
        message: "Not enough points for a joker",
      });
      return;
    }

    const content = session.currentQuestion.content as any;
    const grid = content.grid;

    // Find all valid cells
    const validCells: { x: number; y: number; char: string }[] = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] && grid[y][x] !== "") {
          validCells.push({ x, y, char: grid[y][x] });
        }
      }
    }

    if (validCells.length === 0) return;

    const randomCell =
      validCells[Math.floor(Math.random() * validCells.length)];

    team.score -= 2;
    if (!session.metadata.usedJokers) session.metadata.usedJokers = new Set();
    session.metadata.usedJokers.add(teamId);

    // Update score in DB
    await this.repository.updateTeamScore(teamId, team.score);

    io.to(competitionId).emit("JOKER_REVEAL", {
      questionId,
      teamId,
      letter: randomCell.char,
      x: randomCell.x,
      y: randomCell.y,
      newScore: team.score,
    });

    io.to(competitionId).emit("SCORE_UPDATE", session.teams);
    await this.saveState();
  }

  public async handleGradeDecision(
    competitionId: string,
    answerId: string,
    correct: boolean,
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
    this.logger.info(
      `Next called for ${competitionId}. Current phase: ${session.phase}`,
    );
    const questions =
      await this.repository.getQuestionsForCompetition(competitionId);

    const oldPhase = session.phase;
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
          // Reset last answer status for all teams before timer starts
          for (const team of session.teams) {
            team.lastAnswerCorrect = null;
            team.lastAnswer = null;
          }

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
          (q) => q.id === session.currentQuestion?.id,
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
          (q) => q.id === session.currentQuestion?.id,
        );
        const nextQuestion = questions[currentIndex + 1];
        if (nextQuestion) {
          session.phase = "ROUND_START";
          session.currentQuestion = nextQuestion;
          // Reset last answer status for all teams when moving to next round
          for (const team of session.teams) {
            team.lastAnswerCorrect = null;
            team.lastAnswer = null;
          }
        } else {
          session.phase = "LEADERBOARD";
        }
        break;
      }
      case "LEADERBOARD":
        // Reset or stay?
        break;
    }

    if (oldPhase !== session.phase) {
      this.logger.info(
        `Phase transition in ${competitionId}: ${oldPhase} -> ${session.phase}`,
      );
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
    teamId: string,
  ): Promise<Team | null> {
    this.logger.info(`Reconnecting team ${teamId} in ${competitionId}`);
    const session = this.getOrCreateSession(competitionId);
    const existingTeam = session.teams.find((t) => t.id === teamId);
    if (existingTeam) {
      this.logger.info(`Team ${teamId} found in session, reconnecting.`);
      existingTeam.isConnected = true;
      return existingTeam;
    }

    const restoredTeam = await this.repository.reconnectTeam(
      competitionId,
      teamId,
    );
    if (restoredTeam) {
      // Check again to be safe against race conditions
      const doubleCheck = session.teams.find((t) => t.id === teamId);
      if (doubleCheck) {
        this.logger.info(
          `Team ${teamId} found in session (race check), reconnecting.`,
        );
        doubleCheck.isConnected = true;
        return doubleCheck;
      }

      const teamWithStatus = { ...restoredTeam, isConnected: true };
      session.teams.push(teamWithStatus);
      this.logger.info(`Team ${teamId} restored from DB in ${competitionId}`);
      await this.saveState();
      return teamWithStatus;
    }
    this.logger.warn(`Failed to reconnect team ${teamId} in ${competitionId}`);
    return null;
  }
}

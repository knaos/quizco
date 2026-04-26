import {
  GameState,
  Team,
  Question,
  GamePhase,
  AnswerContent,
  MultipleChoiceContent,
  ClosedQuestionContent,
  FillInTheBlanksContent,
  MatchingContent,
  SessionMetadata,
  Milestone,
} from "@quizco/shared";
import { IGameRepository } from "./repositories/IGameRepository";
import { GradingService } from "./services/GradingService";
import { StatePersistenceService } from "./services/StatePersistenceService";
import { TimerService } from "./services/TimerService";
import { ILogger } from "./utils/Logger";

const TEAM_COLORS = [
  "#E53935", "#D81B60", "#8E24AA", "#5E35B1",
  "#3949AB", "#1E88E5", "#039BE5", "#00ACC1",
  "#00897B", "#43A047", "#7CB342", "#C0CA33",
  "#FDD835", "#FFB300", "#FB8C00", "#F4511E",
  "#6D4C41", "#757575", "#546E7A", "#283593",
  "#00695C", "#AD1457", "#4527A0", "#1565C0",
];

export class GameManager {
  private sessions: Map<string, GameState & { metadata?: SessionMetadata; usedColors?: Set<string> }> = new Map();
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
  ): GameState & { metadata?: SessionMetadata } {
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
        milestones: [],
        revealedMilestones: [],
        usedColors: new Set<string>(),
      });
      this.loadMilestones(competitionId).catch((err) => {
        this.logger.error("Failed to load milestones", err);
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
    const session = this.getOrCreateSession(competitionId);
    const jokerUsedByTeam: Record<string, boolean> = {};
    const jokerRevealedCellsByTeam: Record<string, string[]> = {};

    const usedJokers = session.metadata?.usedJokers || [];
    const revealedCells = session.metadata?.revealedCells || {};

    for (const team of session.teams) {
      jokerUsedByTeam[team.id] = usedJokers.includes(team.id);
      jokerRevealedCellsByTeam[team.id] = revealedCells[team.id] || [];
    }

    return {
      ...session,
      jokerUsedByTeam,
      jokerRevealedCellsByTeam,
    };
  }

  public async addTeam(
    competitionId: string,
    name: string,
    _color: string,
  ): Promise<Team> {
    this.logger.info(`Adding team ${name} to competition ${competitionId}`);
    const session = this.getOrCreateSession(competitionId);
    const existingTeam = session.teams.find((t) => t.name === name);
    if (existingTeam) {
      this.logger.info(`Team ${name} already exists in session, reconnecting.`);
      existingTeam.isConnected = true;
      return existingTeam;
    }

    const assignedColor = this.getNextAvailableColor(session);

    const newTeam = await this.repository.getOrCreateTeam(
      competitionId,
      name,
      assignedColor,
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

  private getNextAvailableColor(
    session: GameState & { metadata?: SessionMetadata; usedColors?: Set<string> },
  ): string {
    let usedColors = session.usedColors;
    if (!usedColors || !(usedColors instanceof Set)) {
      usedColors = new Set<string>();
      session.usedColors = usedColors;
    }
    for (const color of TEAM_COLORS) {
      if (!usedColors.has(color)) {
        usedColors.add(color);
        session.usedColors = usedColors;
        return color;
      }
    }
    const index = session.teams.length % TEAM_COLORS.length;
    return TEAM_COLORS[index];
  }

  public async startQuestion(competitionId: string, questionId: string) {
    this.logger.info(`Starting question ${questionId} in ${competitionId}`);
    const session = this.getOrCreateSession(competitionId);
    const question = await this.repository.getQuestion(questionId);
    if (!question) {
      this.logger.error(`Question ${questionId} not found!`);
      return;
    }

    await this.prepareSessionQuestion(session, question);
    session.phase = "QUESTION_PREVIEW";

    this.timerService.stop(competitionId);

    await this.saveState();
  }

  /**
   * Prepare a question for the session by applying shuffles and setting up session state.
   * This handles MULTIPLE_CHOICE/CLOSED shuffling, MATCHING story shuffling, etc.
   * Used by startQuestion and from transition branches in next().
   */
  private async prepareSessionQuestion(
    session: GameState & { metadata?: SessionMetadata },
    question: Question,
  ): Promise<void> {
    const sessionQuestion = JSON.parse(JSON.stringify(question));

    if (sessionQuestion.type === "CHRONOLOGY") {
      sessionQuestion.content.items = this.shuffleArray(
        sessionQuestion.content.items,
      );
    }

    if (sessionQuestion.type === "FILL_IN_THE_BLANKS") {
      for (const blank of sessionQuestion.content.blanks) {
        blank.options = this.shuffleArray(blank.options);
      }
    }

    if (sessionQuestion.type === "MULTIPLE_CHOICE" || sessionQuestion.type === "CLOSED") {
      const cacheKey = `shuffle_${question.id}` as const;
      const cached = session.metadata?.[cacheKey];
      if (cached) {
        sessionQuestion.content = cached;
      } else {
        const result = this.shuffleWithMapping(sessionQuestion.content);
        sessionQuestion.content = result.shuffled;
        session.metadata = session.metadata || {};
        session.metadata[cacheKey] = result.shuffled;
      }
    }

    if (sessionQuestion.type === "MATCHING") {
      const { heroes, stories } = sessionQuestion.content;
      if (heroes && heroes.length > 0 && stories && stories.length > 0) {
        const shuffledStories = this.shuffleArray([...stories]);
        sessionQuestion.content = { heroes, stories: shuffledStories };
      }
    }

    session.currentQuestion = sessionQuestion;
    session.timeRemaining = question.timeLimitSeconds;
    session.revealStep = 0;
    session.timerPaused = false;

    const preservedChronologyPerfect = session.metadata?.chronologyPerfectAnswers;
    const preservedChronologyBonus = session.metadata?.chronologyBonusAwarded;
    const shuffleData: Record<string, unknown> = {};
    const metadata = session.metadata as Record<string, unknown> | undefined || {};
    for (const key of Object.keys(metadata)) {
      if (key.startsWith("shuffle_")) {
        shuffleData[key] = metadata[key];
      }
    }
    session.metadata = { ...shuffleData };
    if (preservedChronologyPerfect)
      session.metadata.chronologyPerfectAnswers = preservedChronologyPerfect;
    if (preservedChronologyBonus)
      session.metadata.chronologyBonusAwarded = preservedChronologyBonus;

    for (const team of session.teams) {
      team.lastAnswerCorrect = null;
      team.lastAnswer = null;
      team.isExplicitlySubmitted = false;
    }
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

    this.timerService.stop(competitionId);
    session.timerPaused = true;
    await this.saveState();
  }

  public async resumeTimer(
    competitionId: string,
    onTick?: (state: GameState) => void,
  ) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_ACTIVE") return;

    session.timerPaused = false;
    await this.saveState();

    const currentTimeRemaining = session.timeRemaining;
    this.timerService.start(competitionId, currentTimeRemaining, {
      onTick: async (remaining) => {
        if (session.timerPaused) return;
        session.timeRemaining = remaining;
        if (onTick) onTick(session);
      },
      onEnd: async () => {
        session.timerPaused = false;
        await this.endQuestion(competitionId);
        if (onTick) onTick(session);
      },
    });
  }

  public async revealAnswer(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "GRADING" && session.phase !== "QUESTION_ACTIVE")
      return;

    this.timerService.stop(competitionId);

    if (session.currentQuestion) {
      await this.gradeAllAnswers(competitionId);
    }

    session.phase = "REVEAL_ANSWER";

    await this.refreshTeamScores(competitionId);

    await this.saveState();
  }

  private async gradeAllAnswers(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    if (!session.currentQuestion) return;

    this.logger.info(`Grading all teams for ${competitionId}...`);

    for (const team of session.teams) {
      if (team.lastAnswer === null) {
        this.logger.debug(`Skipping grading for team ${team.name} (no answer)`);
        continue;
      }

      const usedJokers = session.metadata?.usedJokers?.includes(team.id) || false;
      const answerToGrade: AnswerContent = team.lastAnswer;

      const gradingResult = this.gradingService.gradeAnswer(
        session.currentQuestion,
        answerToGrade,
        { usedJokers },
      );

      const isCorrect = gradingResult ? gradingResult.isCorrect : null;
      let scoreAwarded = gradingResult ? gradingResult.score : 0;

      this.logger.info(
        `Grading team ${team.name}: answer=${JSON.stringify(team.lastAnswer)}, isCorrect=${isCorrect}, scoreAwarded=${scoreAwarded}`,
      );

      if (isCorrect !== null) {
        const questions = await this.repository.getQuestionsForCompetition(competitionId);
        const questionData = questions.find((q) => q.id === session.currentQuestion!.id);
        const round = questionData?.round;
        const questionPoints = questionData?.points || 0;

        if (isCorrect) {
          if (questionPoints > 0) {
            team.streak = (team.streak || 0) + 1;
          }

          if (
            round?.type === "STREAK" &&
            questionData?.type === "MULTIPLE_CHOICE" &&
            questionData?.content?.options?.length === 2
          ) {
            const lastMilestone = team.lastAwardedBonusTier || 0;
            let newMilestone = 0;

            if (team.streak >= 12 && lastMilestone < 12) {
              newMilestone = 12;
            } else if (team.streak >= 9 && lastMilestone < 9) {
              newMilestone = 9;
            } else if (team.streak >= 6 && lastMilestone < 6) {
              newMilestone = 6;
            }

            if (newMilestone > 0 && newMilestone > lastMilestone) {
              team.lastAwardedBonusTier = newMilestone;
              scoreAwarded += 1;
            }
          }
        } else {
          team.streak = 0;
          team.lastAwardedBonusTier = 0;
        }

        await this.repository.updateTeamStreak(team.id, team.streak);

        await this.repository.saveAnswer(
          team.id,
          session.currentQuestion.id,
          session.currentQuestion.roundId,
          team.lastAnswer,
          isCorrect,
          scoreAwarded,
        );

        team.lastAnswerCorrect = isCorrect;
        team.score += scoreAwarded;
        this.logger.info(
          `Team ${team.name} graded: ${isCorrect ? "CORRECT" : "INCORRECT"}, score: ${scoreAwarded}`,
        );
      }
    }
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
    isFinal: boolean = false,
  ): Promise<
    | { accepted: true; questionEnded: boolean }
    | { accepted: false; reason: "INVALID_PHASE" | "QUESTION_MISMATCH" | "TEAM_NOT_FOUND" }
  > {
    this.logger.debug(
      `Received answer update from team ${teamId} for question ${questionId} in ${competitionId} (isFinal: ${isFinal})`,
    );
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_ACTIVE") {
      this.logger.warn(
        `Rejecting answer from team ${teamId}: session ${competitionId} is in phase ${session.phase}`,
      );
      return { accepted: false, reason: "INVALID_PHASE" };
    }
    if (session.currentQuestion?.id !== questionId) {
      this.logger.warn(
        `Rejecting answer from team ${teamId}: current question is ${session.currentQuestion?.id}, but answer is for ${questionId}`,
      );
      return { accepted: false, reason: "QUESTION_MISMATCH" };
    }

    const team = session.teams.find((t) => t.id === teamId);
    if (!team) {
      this.logger.warn(
        `Rejecting answer from unknown team ${teamId} in competition ${competitionId}`,
      );
      return { accepted: false, reason: "TEAM_NOT_FOUND" };
    }

    team.lastAnswer = answer;
    if (isFinal) {
      team.isExplicitlySubmitted = true;
    }

    // For AUTO-graded questions, set lastAnswerCorrect immediately without updating score
    // Scores are only updated during REVEAL_ANSWER phase
    if (session.currentQuestion?.grading === "AUTO") {
      const usedJokers = session.metadata?.usedJokers?.includes(teamId) || false;
      const gradingResult = this.gradingService.gradeAnswer(
        session.currentQuestion,
        answer,
        { usedJokers },
      );
      if (gradingResult) {
        team.lastAnswerCorrect = gradingResult.isCorrect;
      }
    }

    // Store in Repository as partial submission (isCorrect: null, scoreAwarded: 0)
    await this.repository.saveAnswer(
      teamId,
      questionId,
      session.currentQuestion.roundId,
      answer,
      null,
      0,
    );

    await this.saveState();

    // Check if all teams have explicitly submitted
    const explicitlySubmittedCount = session.teams.filter(
      (t) => t.isExplicitlySubmitted,
    ).length;
    let questionEnded = false;
    if (
      explicitlySubmittedCount >= session.teams.length &&
      session.teams.length > 0
    ) {
      this.logger.info(
        `All teams explicitly submitted for ${questionId}. Ending question.`,
      );
      await this.endQuestion(competitionId);
      questionEnded = true;
    }

    return { accepted: true, questionEnded };
  }

  public async handleJokerReveal(
    competitionId: string,
    teamId: string,
    questionId: string,
    x: number,
    y: number,
    io: any,
    teamSocketId?: string,
  ) {
    const session = this.getOrCreateSession(competitionId);
    if (session.phase !== "QUESTION_ACTIVE") return;
    if (session.currentQuestion?.type !== "CROSSWORD") return;
    if (session.currentQuestion.id !== questionId) return;

    const team = session.teams.find((t) => t.id === teamId);
    if (!team) return;

    // Joker cost: free for 0-point questions, otherwise 2 points (capped by available score)
    const questionPoints = session.currentQuestion.points || 0;
    const jokerCost = questionPoints === 0 ? 0 : 2;

    if (team.score < jokerCost) {
      io.to(`competition_${competitionId}`).emit("JOKER_ERROR", {
        message: "Not enough points for a joker",
      });
      return;
    }

    const content = session.currentQuestion.content as any;
    const grid = content.grid;

    // Ensure metadata for this question's jokers exists
    session.metadata = session.metadata || {};
    if (!session.metadata.usedJokers) {
      session.metadata.usedJokers = [];
    }
    if (session.metadata.usedJokers.includes(teamId)) {
      io.to(`competition_${competitionId}`).emit("JOKER_ERROR", {
        message: "Joker already used for this question",
      });
      return;
    }

    // Validate the selected cell
    if (
      y < 0 ||
      y >= grid.length ||
      x < 0 ||
      x >= grid[y].length ||
      !grid[y][x] ||
      grid[y][x].trim() === ""
    ) {
      io.to(`competition_${competitionId}`).emit("JOKER_ERROR", {
        message: "Invalid cell selection",
      });
      return;
    }

    const selectedCellChar = grid[y][x];
    const coord = `${x},${y}`;

    // Initialize revealedCells if not exists
    if (!session.metadata.revealedCells) {
      session.metadata.revealedCells = {};
    }
    if (!session.metadata.revealedCells[teamId]) {
      session.metadata.revealedCells[teamId] = [];
    }

    // Check if this cell was already revealed
    if (session.metadata.revealedCells[teamId].includes(coord)) {
      io.to(`competition_${competitionId}`).emit("JOKER_ERROR", {
        message: "Cell already revealed",
      });
      return;
    }

    team.score -= jokerCost;
    session.metadata.revealedCells[teamId].push(coord);
    session.metadata.usedJokers.push(teamId);

    // Update score in DB
    await this.repository.updateTeamScore(teamId, team.score);

    if (teamSocketId) {
      const targetSocket = io.sockets.sockets.get(teamSocketId);
      if (targetSocket) {
        targetSocket.emit("JOKER_REVEAL", {
          questionId,
          teamId,
          letter: selectedCellChar,
          x,
          y,
          newScore: team.score,
          cost: jokerCost,
        });
      } else {
        this.logger.warn(`JOKER_REVEAL: socket not found for team ${teamId}`);
      }
    } else {
      this.logger.warn(`JOKER_REVEAL: no socket id provided for team ${teamId}`);
    }

    io.to(`competition_${competitionId}`).emit("SCORE_UPDATE", session.teams);
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
    // Note: We don't reload from DB because scores include in-memory adjustments
    // (like joker penalties) that aren't stored in the DB.
    // The scores are kept in sync via saveState() and socket events.
  }

  public async setPhase(competitionId: string, phase: GamePhase) {
    const session = this.getOrCreateSession(competitionId);
    session.phase = phase;
    await this.saveState();
  }

  public async next(competitionId: string, onTick: (state: GameState) => void): Promise<number[]> {
    const session = this.getOrCreateSession(competitionId);
    this.logger.info(
      `Next called for ${competitionId}. Current phase: ${session.phase}`,
    );
    const questions =
      await this.repository.getQuestionsForCompetition(competitionId);

    const oldPhase = session.phase;
    let newlyRevealed: number[] = [];
    switch (session.phase) {
      case "WAITING":
        session.phase = "WELCOME";
        break;
      case "WELCOME":
        if (questions.length > 0) {
          const q = questions[0];
          await this.prepareSessionQuestion(session, q);
          session.phase = "ROUND_START"; // Set phase after preparation
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
            team.isExplicitlySubmitted = false;
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
        newlyRevealed = this.checkAndRevealMilestones(competitionId);
        const currentIndex = questions.findIndex(
          (q) => q.id === session.currentQuestion?.id,
        );
        const nextQuestion = questions[currentIndex + 1];
        if (nextQuestion) {
          await this.prepareSessionQuestion(session, nextQuestion);
          session.phase = "ROUND_START"; // Set phase after preparation
        } else {
          session.phase = "LEADERBOARD";
        }
        break;
      }
      case "LEADERBOARD": {
        /**
         * Reset the competition to allow for a replay.
         * Clears all team scores and streaks while preserving team records.
         * Deletes all answers from the database.
         * Transitions back to WAITING phase.
         */
        session.phase = "WAITING";
        session.currentQuestion = null;
        session.revealStep = 0;
        session.timeRemaining = 0;
        session.timerPaused = false;

        // Reset team scores and streaks but keep team records
        for (const team of session.teams) {
          team.score = 0;
          team.streak = 0;
          team.lastAnswerCorrect = null;
          team.lastAnswer = null;
          team.isExplicitlySubmitted = false;
        }

        // Delete all answers for this competition from the database
        await this.repository.deleteAnswersForCompetition(competitionId);

        // Clear chronology tracking for fresh replay
        session.metadata = {};

        this.logger.info(
          `Competition ${competitionId} reset from LEADERBOARD. Teams cleared for replay and answers deleted.`,
        );
        break;
      }
    }

    if (oldPhase !== session.phase) {
      this.logger.info(
        `Phase transition in ${competitionId}: ${oldPhase} -> ${session.phase}`,
      );
    }
    await this.saveState();
    return newlyRevealed;
  }

  public async getAllQuestions() {
    return this.repository.getAllQuestions();
  }

  public async getQuestionsForCompetition(competitionId: string) {
    return this.repository.getQuestionsForCompetition(competitionId);
  }

  public async loadMilestones(competitionId: string) {
    const session = this.getOrCreateSession(competitionId);
    const milestones = await this.repository.getCompetitionMilestones(competitionId);
    session.milestones = milestones;
    await this.saveState();
  }

  public getTotalPoints(competitionId: string): number {
    const session = this.sessions.get(competitionId);
    if (!session) return 0;
    return session.teams.reduce((sum, team) => sum + team.score, 0);
  }

  public checkAndRevealMilestones(competitionId: string): number[] {
    const session = this.sessions.get(competitionId);
    if (!session || session.milestones.length === 0) return [];

    const totalPoints = this.getTotalPoints(competitionId);
    const newlyRevealed: number[] = [];

    session.milestones.forEach((milestone, index) => {
      if (
        totalPoints >= milestone.threshold &&
        !session.revealedMilestones.includes(index)
      ) {
        session.revealedMilestones.push(index);
        newlyRevealed.push(index);
      }
    });

    return newlyRevealed;
  }

  /**
      * Shuffle options while tracking the mapping from original to shuffled indices.
      * Used for consistent shuffle across clients and correct grading.
      */
  private shuffleWithMapping(content: MultipleChoiceContent): {
    shuffled: MultipleChoiceContent;
    indexMapping: number[]; // original index -> new index
  } {
    if (!content.options || content.options.length === 0) {
      return {
        shuffled: content,
        indexMapping: [],
      };
    }

    const options = content.options;
    const correctIndices = new Set(content.correctIndices);

    // Map options to objects preserving original index
    const entriesWithIndex = options.map((option, originalIndex) => ({
      option,
      originalIndex,
    }));

    // Shuffle the entries
    const shuffledEntries = this.shuffleArray(entriesWithIndex);

    // Build indexMapping: originalIndex -> newIndex
    const indexMapping: number[] = shuffledEntries.map(
      (entry) => entry.originalIndex,
    );

    // Compute new correct indices from shuffled entries
    const newCorrectIndices: number[] = [];
    shuffledEntries.forEach((entry, newIndex) => {
      if (correctIndices.has(entry.originalIndex)) {
        newCorrectIndices.push(newIndex);
      }
    });

    // Restore options to original values
    const shuffledOptions = shuffledEntries.map((entry) => entry.option);

    return {
      shuffled: { ...content, options: shuffledOptions, correctIndices: newCorrectIndices },
      indexMapping,
    };
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

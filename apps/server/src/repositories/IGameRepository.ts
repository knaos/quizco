import { Question, Team } from "@quizco/shared";

export interface IGameRepository {
  // Teams
  getOrCreateTeam(
    competitionId: string,
    name: string,
    color: string
  ): Promise<Team>;
  getTeamScore(competitionId: string, teamId: string): Promise<number>;
  updateTeamStreak(teamId: string, streak: number): Promise<void>;
  reconnectTeam(competitionId: string, teamId: string): Promise<Team | null>;

  // Questions
  getQuestion(questionId: string): Promise<Question | null>;
  getAllQuestions(): Promise<any[]>;
  getQuestionsForCompetition(competitionId: string): Promise<any[]>;

  // Answers & Grading
  saveAnswer(
    teamId: string,
    questionId: string,
    roundId: string,
    submittedContent: any,
    isCorrect: boolean | null,
    scoreAwarded: number
  ): Promise<any>;
  getAnswer(answerId: string): Promise<any>;
  updateAnswerGrading(
    answerId: string,
    isCorrect: boolean,
    scoreAwarded: number
  ): Promise<void>;
  getSubmissionCount(questionId: string): Promise<number>;

  // Pending Answers for Host
  getPendingAnswers(competitionId?: string): Promise<any[]>;
}

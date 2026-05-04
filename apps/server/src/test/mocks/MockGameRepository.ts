import {
  Question,
  Team,
  ActorRole,
  AnswerSnapshotType,
  AdminAnswerHistoryRecord,
} from "@quizco/shared";
import { IGameRepository } from "../../repositories/IGameRepository";
import { v4 as uuidv4 } from "uuid";

export class MockGameRepository implements IGameRepository {
  public teams: Team[] = [];
  public questions: Question[] = [];
  public answers: any[] = [];
  public answerSnapshots: any[] = [];

  async getOrCreateTeam(
    competitionId: string,
    name: string,
    color: string,
  ): Promise<Team> {
    let team = this.teams.find((t) => t.name === name);
    if (!team) {
      team = {
        id: uuidv4(),
        name,
        color,
        score: 0,
        streak: 0,
        lastAnswerCorrect: null,
        lastAnswer: null,
        isExplicitlySubmitted: false,
        isConnected: false,
      };
      this.teams.push(team);
    }
    return team;
  }

  async getTeamScore(competitionId: string, teamId: string): Promise<number> {
    // Include all answers that have been graded (not null)
    // This allows partial scoring for FILL_IN_THE_BLANKS to be counted
    return (
      this.answers
        .filter((a) => a.teamId === teamId && a.isCorrect !== null)
        .reduce((sum, a) => sum + a.scoreAwarded, 0) || 0
    );
  }

  async updateTeamStreak(teamId: string, streak: number): Promise<void> {
    const team = this.teams.find((t) => t.id === teamId);
    if (team) {
      team.streak = streak;
    }
  }

  async updateTeamScore(teamId: string, score: number): Promise<void> {
    const team = this.teams.find((t) => t.id === teamId);
    if (team) {
      team.score = score;
    }
  }

  async reconnectTeam(
    competitionId: string,
    teamId: string,
  ): Promise<Team | null> {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return null;
    team.score = await this.getTeamScore(competitionId, teamId);
    return team;
  }

  async getQuestion(questionId: string): Promise<Question | null> {
    return this.questions.find((q) => q.id === questionId) || null;
  }

  async getAllQuestions(): Promise<any[]> {
    return this.questions;
  }

  async getQuestionsForCompetition(competitionId: string): Promise<any[]> {
    // In mock we assume all questions belong to the competition for simplicity
    return this.questions;
  }

  async saveAnswer(
    teamId: string,
    questionId: string,
    roundId: string,
    submittedContent: any,
    isCorrect: boolean | null,
    scoreAwarded: number,
  ): Promise<any> {
    let answer = this.answers.find(
      (a) => a.teamId === teamId && a.questionId === questionId,
    );
    if (answer) {
      answer.submittedContent = submittedContent;
      answer.isCorrect = isCorrect;
      answer.scoreAwarded = scoreAwarded;
    } else {
      answer = {
        id: uuidv4(),
        teamId: teamId,
        questionId: questionId,
        roundId: roundId,
        submittedContent: submittedContent,
        isCorrect: isCorrect,
        scoreAwarded: scoreAwarded,
      };
      this.answers.push(answer);
    }
    return answer;
  }

  async getAnswer(answerId: string): Promise<any> {
    return this.answers.find((a) => a.id === answerId);
  }

  async answerBelongsToCompetition(
    answerId: string,
    _competitionId: string,
  ): Promise<boolean> {
    return this.answers.some((answer) => answer.id === answerId);
  }

  async updateAnswerGrading(
    answerId: string,
    isCorrect: boolean,
    scoreAwarded: number,
  ): Promise<void> {
    const answer = this.answers.find((a) => a.id === answerId);
    if (answer) {
      answer.isCorrect = isCorrect;
      answer.scoreAwarded = scoreAwarded;
    }
  }

  async updateAnswerScore(
    answerId: string,
    scoreAwarded: number,
    _actorRole: ActorRole,
  ): Promise<void> {
    const answer = this.answers.find((a) => a.id === answerId);
    if (answer) {
      answer.scoreAwarded = scoreAwarded;
    }
  }

  async createAnswerSnapshot(input: {
    answerId: string;
    competitionId: string;
    teamId: string;
    questionId: string;
    roundId: string;
    snapshotType: AnswerSnapshotType;
    actorRole: ActorRole;
    submittedContent: unknown;
    isCorrect: boolean | null;
    scoreAwarded: number;
  }): Promise<void> {
    this.answerSnapshots.push({
      id: uuidv4(),
      ...input,
      createdAt: new Date().toISOString(),
    });
  }

  async getSubmissionCount(questionId: string): Promise<number> {
    return this.answers.filter((a) => a.questionId === questionId).length;
  }

  async getPendingAnswers(competitionId?: string): Promise<any[]> {
    return this.answers
      .filter((a) => a.isCorrect === null)
      .map((a) => ({
        ...a,
        team_name: this.teams.find((t) => t.id === a.teamId)?.name,
        question_text: this.questions.find((q) => q.id === a.questionId)
          ?.questionText,
      }));
  }

  async getQuestionAnswers(
    competitionId: string,
    questionId: string,
  ): Promise<any[]> {
    return this.answers
      .filter((a) => a.questionId === questionId)
      .map((a) => {
        const team = this.teams.find((t) => t.id === a.teamId);
        return {
          answerId: a.id,
          teamId: a.teamId,
          questionId: a.questionId,
          roundId: a.roundId,
          teamName: team?.name,
          color: team?.color,
          submittedContent: a.submittedContent,
          isCorrect: a.isCorrect,
          points: a.scoreAwarded,
        };
      });
  }

  async getCompetitionAnswerHistory(
    competitionId: string,
  ): Promise<AdminAnswerHistoryRecord[]> {
    return this.answers.map((answer) => {
      const team = this.teams.find((teamItem) => teamItem.id === answer.teamId);
      const question = this.questions.find(
        (questionItem) => questionItem.id === answer.questionId,
      );
      return {
        answerId: answer.id,
        competitionId,
        teamId: answer.teamId,
        teamName: team?.name ?? "Unknown Team",
        teamColor: team?.color ?? "",
        questionId: answer.questionId,
        questionText: question?.questionText ?? "",
        roundId: answer.roundId,
        roundTitle: null,
        latestSubmittedContent: answer.submittedContent,
        latestIsCorrect: answer.isCorrect,
        latestScoreAwarded: answer.scoreAwarded,
        snapshots: this.answerSnapshots
          .filter((snapshot) => snapshot.answerId === answer.id)
          .map((snapshot) => ({
            ...snapshot,
            teamName: team?.name ?? "Unknown Team",
            questionText: question?.questionText ?? "",
            roundTitle: null,
          })),
      };
    });
  }

  async getTeamAnswerHistory(
    competitionId: string,
    teamId: string,
  ): Promise<AdminAnswerHistoryRecord[]> {
    return this.questions.map((question) => {
      const answer = this.answers.find(
        (answerItem) => answerItem.questionId === question.id && answerItem.teamId === teamId,
      );
      const team = this.teams.find((teamItem) => teamItem.id === teamId);
      return {
        answerId: answer?.id ?? question.id,
        competitionId,
        teamId,
        teamName: team?.name ?? "",
        teamColor: team?.color ?? "",
        questionId: question.id,
        questionText: question.questionText,
        roundId: question.roundId,
        roundTitle: null,
        latestSubmittedContent: answer?.submittedContent ?? "",
        latestIsCorrect: answer?.isCorrect ?? null,
        latestScoreAwarded: answer?.scoreAwarded ?? 0,
        snapshots: this.answerSnapshots
          .filter((snapshot) => answer && snapshot.answerId === answer.id)
          .map((snapshot) => ({
            ...snapshot,
            teamName: team?.name ?? "",
            questionText: question.questionText,
            roundTitle: null,
          })),
      };
    });
  }

  async deleteAnswersForCompetition(competitionId: string): Promise<void> {
    this.answers = [];
    this.answerSnapshots = [];
  }

  async getCompetitionMilestones(): Promise<any[]> {
    return [];
  }
}

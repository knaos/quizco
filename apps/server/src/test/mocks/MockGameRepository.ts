import { Question, Team } from "@quizco/shared";
import { IGameRepository } from "../../repositories/IGameRepository";
import { v4 as uuidv4 } from "uuid";

export class MockGameRepository implements IGameRepository {
  public teams: Team[] = [];
  public questions: Question[] = [];
  public answers: any[] = [];

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
        lastAnswerCorrect: null,
      };
      this.teams.push(team);
    }
    return team;
  }

  async getTeamScore(competitionId: string, teamId: string): Promise<number> {
    return (
      this.answers
        .filter((a) => a.teamId === teamId && a.isCorrect === true)
        .reduce((sum, a) => sum + a.scoreAwarded, 0) || 0
    );
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
    const answer = {
      id: uuidv4(),
      teamId: teamId,
      questionId: questionId,
      roundId: roundId,
      submittedContent: submittedContent,
      isCorrect: isCorrect,
      scoreAwarded: scoreAwarded,
    };
    this.answers.push(answer);
    return answer;
  }

  async getAnswer(answerId: string): Promise<any> {
    return this.answers.find((a) => a.id === answerId);
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
}

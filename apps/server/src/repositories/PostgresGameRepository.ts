import { Question, Team, QuestionType, GradingMode } from "@quizco/shared";
import prisma from "../db/prisma";
import { IGameRepository } from "./IGameRepository";

export class PostgresGameRepository implements IGameRepository {
  async getOrCreateTeam(
    competitionId: string,
    name: string,
    color: string
  ): Promise<Team> {
    const dbTeam = await prisma.teams.upsert({
      where: { name },
      update: { color },
      create: { name, color },
    });

    const score = await this.getTeamScore(competitionId, dbTeam.id);

    return {
      id: dbTeam.id,
      name: dbTeam.name,
      color: dbTeam.color || "",
      score,
      lastAnswerCorrect: null,
    };
  }

  async getTeamScore(competitionId: string, teamId: string): Promise<number> {
    const aggregate = await prisma.answers.aggregate({
      _sum: {
        score_awarded: true,
      },
      where: {
        team_id: teamId,
        is_correct: true,
        rounds: {
          competition_id: competitionId,
        },
      },
    });

    return aggregate._sum.score_awarded || 0;
  }

  async reconnectTeam(
    competitionId: string,
    teamId: string
  ): Promise<Team | null> {
    const dbTeam = await prisma.teams.findUnique({
      where: { id: teamId },
    });

    if (!dbTeam) return null;

    const score = await this.getTeamScore(competitionId, teamId);

    return {
      id: dbTeam.id,
      name: dbTeam.name,
      color: dbTeam.color || "",
      score,
      lastAnswerCorrect: null,
    };
  }

  async getQuestion(questionId: string): Promise<Question | null> {
    const dbQuestion = await prisma.questions.findUnique({
      where: { id: questionId },
    });

    if (!dbQuestion) return null;

    return {
      id: dbQuestion.id,
      round_id: dbQuestion.round_id || "",
      question_text: dbQuestion.question_text,
      type: dbQuestion.type as QuestionType,
      points: dbQuestion.points || 0,
      time_limit_seconds: dbQuestion.time_limit_seconds || 0,
      content: dbQuestion.content,
      grading: (dbQuestion.grading as GradingMode) || "AUTO",
    };
  }

  async getAllQuestions(): Promise<any[]> {
    return prisma.questions.findMany({
      orderBy: { created_at: "asc" },
    });
  }

  async getQuestionsForCompetition(competitionId: string): Promise<any[]> {
    return prisma.questions.findMany({
      where: {
        rounds: {
          competition_id: competitionId,
        },
      },
      orderBy: [
        {
          rounds: {
            order_index: "asc",
          },
        },
        {
          created_at: "asc",
        },
      ],
      include: {
        rounds: true,
      },
    });
  }

  async saveAnswer(
    teamId: string,
    questionId: string,
    roundId: string,
    submittedContent: any,
    isCorrect: boolean | null,
    scoreAwarded: number
  ): Promise<any> {
    return prisma.answers.create({
      data: {
        team_id: teamId,
        question_id: questionId,
        round_id: roundId,
        submitted_content: submittedContent,
        is_correct: isCorrect,
        score_awarded: scoreAwarded,
      },
    });
  }

  async getAnswer(answerId: string): Promise<any> {
    return prisma.answers.findUnique({
      where: { id: answerId },
    });
  }

  async updateAnswerGrading(
    answerId: string,
    isCorrect: boolean,
    scoreAwarded: number
  ): Promise<void> {
    await prisma.answers.update({
      where: { id: answerId },
      data: {
        is_correct: isCorrect,
        score_awarded: scoreAwarded,
      },
    });
  }

  async getSubmissionCount(questionId: string): Promise<number> {
    return prisma.answers.count({
      where: {
        question_id: questionId,
      },
    });
  }

  async getPendingAnswers(competitionId?: string): Promise<any[]> {
    const answers = await prisma.answers.findMany({
      where: {
        is_correct: null,
        ...(competitionId
          ? {
              rounds: {
                competition_id: competitionId,
              },
            }
          : {}),
      },
      include: {
        teams: {
          select: { name: true },
        },
        questions: {
          select: { question_text: true },
        },
      },
    });

    // Map to match the previous structure if needed
    return answers.map((a) => ({
      ...a,
      team_name: a.teams?.name,
      question_text: a.questions?.question_text,
    }));
  }
}

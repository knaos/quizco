import {
  CompetitionStatus,
  QuestionType,
  RoundType,
  GradingMode,
} from "@prisma/client";
import { Question, Team, QuestionContent } from "@quizco/shared";
import prisma from "../db/prisma";
import { IGameRepository } from "./IGameRepository";

export class PostgresGameRepository implements IGameRepository {
  async getOrCreateTeam(
    competitionId: string,
    name: string,
    color: string
  ): Promise<Team> {
    const dbTeam = await prisma.team.upsert({
      where: {
        competitionId_name: {
          competitionId,
          name,
        },
      },
      update: { color },
      create: {
        competition: { connect: { id: competitionId } },
        name,
        color,
      },
    });

    const score = await this.getTeamScore(competitionId, dbTeam.id);

    return {
      id: dbTeam.id,
      name: dbTeam.name,
      color: dbTeam.color || "",
      score,
      streak: dbTeam.streak,
      lastAnswerCorrect: null,
      lastAnswer: null,
      isConnected: false,
    };
  }

  async getTeamScore(competitionId: string, teamId: string): Promise<number> {
    const aggregate = await prisma.answer.aggregate({
      _sum: {
        scoreAwarded: true,
      },
      where: {
        teamId: teamId,
        isCorrect: true,
        round: {
          competitionId: competitionId,
        },
      },
    });

    return aggregate._sum.scoreAwarded || 0;
  }

  async updateTeamStreak(teamId: string, streak: number): Promise<void> {
    await prisma.team.update({
      where: { id: teamId },
      data: { streak },
    });
  }

  async reconnectTeam(
    competitionId: string,
    teamId: string
  ): Promise<Team | null> {
    const dbTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!dbTeam) return null;

    const score = await this.getTeamScore(competitionId, teamId);

    return {
      id: dbTeam.id,
      name: dbTeam.name,
      color: dbTeam.color || "",
      score,
      streak: dbTeam.streak,
      lastAnswerCorrect: null,
      lastAnswer: null,
      isConnected: false,
    };
  }

  async getQuestion(questionId: string): Promise<Question | null> {
    const dbQuestion = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!dbQuestion) return null;

    const baseQuestion = {
      id: dbQuestion.id,
      roundId: dbQuestion.roundId,
      questionText: dbQuestion.questionText,
      points: dbQuestion.points,
      timeLimitSeconds: dbQuestion.timeLimitSeconds,
      grading: dbQuestion.grading as GradingMode,
    };

    // Cast content based on the specific question type to satisfy discriminated union
    return {
      ...baseQuestion,
      type: dbQuestion.type,
      content: dbQuestion.content as unknown as QuestionContent,
    } as Question;
  }

  async getAllQuestions(): Promise<any[]> {
    return prisma.question.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  async getQuestionsForCompetition(competitionId: string): Promise<any[]> {
    const questions = await prisma.question.findMany({
      where: {
        round: {
          competitionId: competitionId,
        },
      },
      orderBy: [
        {
          round: {
            orderIndex: "asc",
          },
        },
        {
          createdAt: "asc",
        },
      ],
      include: {
        round: true,
      },
    });

    return questions.map((q: any) => ({
      id: q.id,
      roundId: q.roundId,
      questionText: q.questionText,
      type: q.type,
      points: q.points,
      timeLimitSeconds: q.timeLimitSeconds,
      content: q.content,
      grading: q.grading,
      round: q.round,
    }));
  }

  async saveAnswer(
    teamId: string,
    questionId: string,
    roundId: string,
    submittedContent: any,
    isCorrect: boolean | null,
    scoreAwarded: number
  ): Promise<any> {
    return prisma.answer.create({
      data: {
        teamId: teamId,
        questionId: questionId,
        roundId: roundId,
        submittedContent: submittedContent,
        isCorrect: isCorrect,
        scoreAwarded: scoreAwarded,
      },
    });
  }

  async getAnswer(answerId: string): Promise<any> {
    return prisma.answer.findUnique({
      where: { id: answerId },
    });
  }

  async updateAnswerGrading(
    answerId: string,
    isCorrect: boolean,
    scoreAwarded: number
  ): Promise<void> {
    await prisma.answer.update({
      where: { id: answerId },
      data: {
        isCorrect: isCorrect,
        scoreAwarded: scoreAwarded,
      },
    });
  }

  async getSubmissionCount(questionId: string): Promise<number> {
    return prisma.answer.count({
      where: {
        questionId: questionId,
      },
    });
  }

  async getPendingAnswers(competitionId?: string): Promise<any[]> {
    const answers = await prisma.answer.findMany({
      where: {
        isCorrect: null,
        ...(competitionId
          ? {
              round: {
                competitionId: competitionId,
              },
            }
          : {}),
      },
      include: {
        team: {
          select: { name: true },
        },
        question: {
          select: { questionText: true },
        },
      },
    });

    return answers.map((a: any) => ({
      ...a,
      team_name: a.team?.name,
      question_text: a.question?.questionText,
    }));
  }
}

import {
  CompetitionStatus,
  QuestionType,
  RoundType,
  GradingMode,
  ActorRole as PrismaActorRole,
  AnswerSnapshotType as PrismaAnswerSnapshotType,
} from "@prisma/client";
import {
  Question,
  Team,
  QuestionContent,
  Milestone,
  ActorRole,
  AnswerSnapshotType,
  AdminAnswerHistoryRecord,
} from "@quizco/shared";
import prisma from "../db/prisma";
import { IGameRepository } from "./IGameRepository";

export class PostgresGameRepository implements IGameRepository {
  async getOrCreateTeam(
    competitionId: string,
    name: string,
    color: string,
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
      isExplicitlySubmitted: false,
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
        // Include all answers that have been graded (not null)
        // This allows partial scoring for FILL_IN_THE_BLANKS to be counted
        isCorrect: { not: null },
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

  async updateTeamScore(teamId: string, _score: number): Promise<void> {
    // Current schema calculates scores from Answer table.
    // If we want to persist score penalties (like Joker -2),
    // we would ideally have a "scoreAdjustment" field in Team or a dedicated Adjustment table.
    // For now, score is kept in memory in GameManager and synced.
  }

  async reconnectTeam(
    competitionId: string,
    teamId: string,
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
      isExplicitlySubmitted: false,
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
      source: dbQuestion.source,
      points: dbQuestion.points,
      timeLimitSeconds: dbQuestion.timeLimitSeconds,
      grading: dbQuestion.grading as GradingMode,
      section: dbQuestion.section,
      index: dbQuestion.index,
      realIndex: dbQuestion.realIndex ?? dbQuestion.index,
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
      orderBy: [
        {
          round: {
            orderIndex: "asc",
          },
        },
        { realIndex: "asc" },
        { index: "asc" },
        { createdAt: "asc" },
      ],
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
          realIndex: "asc",
        },
        {
          index: "asc",
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
      source: q.source,
      type: q.type,
      points: q.points,
      timeLimitSeconds: q.timeLimitSeconds,
      content: q.content,
      grading: q.grading,
      section: q.section,
      index: q.index,
      realIndex: q.realIndex,
      round: q.round,
    }));
  }

  async saveAnswer(
    teamId: string,
    questionId: string,
    roundId: string,
    submittedContent: any,
    isCorrect: boolean | null,
    scoreAwarded: number,
  ): Promise<any> {
    return prisma.answer.upsert({
      where: {
        teamId_questionId: {
          teamId,
          questionId,
        },
      },
      update: {
        submittedContent,
        isCorrect,
        scoreAwarded,
        submittedAt: new Date(),
      },
      create: {
        teamId,
        questionId,
        roundId,
        submittedContent,
        isCorrect,
        scoreAwarded,
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
    scoreAwarded: number,
  ): Promise<void> {
    await prisma.answer.update({
      where: { id: answerId },
      data: {
        isCorrect: isCorrect,
        scoreAwarded: scoreAwarded,
      },
    });
  }

  async updateAnswerScore(
    answerId: string,
    scoreAwarded: number,
    _actorRole: ActorRole,
  ): Promise<void> {
    await prisma.answer.update({
      where: { id: answerId },
      data: { scoreAwarded },
    });
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
    await prisma.answerSnapshot.create({
      data: {
        answerId: input.answerId,
        competitionId: input.competitionId,
        teamId: input.teamId,
        questionId: input.questionId,
        roundId: input.roundId,
        snapshotType: input.snapshotType as PrismaAnswerSnapshotType,
        actorRole: input.actorRole as PrismaActorRole,
        submittedContent: input.submittedContent as object,
        isCorrect: input.isCorrect,
        scoreAwarded: input.scoreAwarded,
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

  async getQuestionAnswers(
    competitionId: string,
    questionId: string,
  ): Promise<any[]> {
    const answers = await prisma.answer.findMany({
      where: {
        questionId,
        team: {
          competitionId: competitionId,
        },
      },
      include: {
        team: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

    return answers.map((a: any) => ({
      answerId: a.id,
      teamId: a.teamId,
      questionId: a.questionId,
      roundId: a.roundId,
      teamName: a.team.name,
      color: a.team.color,
      submittedContent: a.submittedContent,
      isCorrect: a.isCorrect,
      points: a.scoreAwarded,
    }));
  }

  async getCompetitionAnswerHistory(
    competitionId: string,
  ): Promise<AdminAnswerHistoryRecord[]> {
    const answers = await prisma.answer.findMany({
      where: {
        team: {
          competitionId,
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        question: {
          select: {
            id: true,
            questionText: true,
          },
        },
        round: {
          select: {
            id: true,
            title: true,
          },
        },
        snapshots: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: [
        { round: { orderIndex: "asc" } },
        { question: { realIndex: "asc" } },
        { team: { name: "asc" } },
      ],
    });

    return answers.map((answer) => ({
      answerId: answer.id,
      competitionId,
      teamId: answer.team.id,
      teamName: answer.team.name,
      teamColor: answer.team.color ?? "",
      questionId: answer.question.id,
      questionText: answer.question.questionText,
      roundId: answer.round.id,
      roundTitle: answer.round.title,
      latestSubmittedContent: answer.submittedContent as unknown as any,
      latestIsCorrect: answer.isCorrect,
      latestScoreAwarded: answer.scoreAwarded,
      snapshots: answer.snapshots.map((snapshot) => ({
        id: snapshot.id,
        answerId: snapshot.answerId,
        competitionId: snapshot.competitionId,
        teamId: snapshot.teamId,
        teamName: answer.team.name,
        questionId: snapshot.questionId,
        questionText: answer.question.questionText,
        roundId: snapshot.roundId,
        roundTitle: answer.round.title,
        snapshotType: snapshot.snapshotType as AnswerSnapshotType,
        actorRole: snapshot.actorRole as ActorRole,
        submittedContent: snapshot.submittedContent as any,
        isCorrect: snapshot.isCorrect,
        scoreAwarded: snapshot.scoreAwarded,
        createdAt: snapshot.createdAt.toISOString(),
      })),
    }));
  }

  async deleteAnswersForCompetition(competitionId: string): Promise<void> {
    await prisma.answer.deleteMany({
      where: {
        round: {
          competitionId: competitionId,
        },
      },
    });
  }

  async getCompetitionMilestones(competitionId: string): Promise<Milestone[]> {
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: { milestones: true },
    });
    const raw = competition?.milestones;
    if (!raw || !Array.isArray(raw)) return [];
    return raw as unknown as Milestone[];
  }
}

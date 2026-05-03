import { Router } from "express";
import prisma from "../db/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  CompetitionStatus,
  QuestionType,
  RoundType,
  GradingMode,
  Prisma,
} from "@prisma/client";
import type {
  CompetitionImportDocument,
  CompetitionImportQuestion,
  CompetitionImportRound,
  QuestionType as SharedQuestionType,
  Round as SharedRound,
} from "@quizco/shared";

const router = Router();
const QUESTION_TYPES = new Set<SharedQuestionType>([
  "CLOSED",
  "MULTIPLE_CHOICE",
  "OPEN_WORD",
  "CROSSWORD",
  "FILL_IN_THE_BLANKS",
  "MATCHING",
  "CHRONOLOGY",
  "TRUE_FALSE",
  "CORRECT_THE_ERROR",
]);
const ROUND_TYPES = new Set<SharedRound["type"]>([
  "STANDARD",
  "CROSSWORD",
  "SPEED_RUN",
  "STREAK",
]);
const COMPETITION_STATUSES = new Set<CompetitionStatus>([
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
]);

async function getNextQuestionIndex(
  roundId: string,
  section?: string | null,
): Promise<number> {
  const aggregate = await prisma.question.aggregate({
    _max: {
      index: true,
    },
    where: {
      roundId,
      section: section ?? null,
    },
  });

  return (aggregate._max.index ?? -1) + 1;
}

async function getNextRealIndex(roundId: string): Promise<number> {
  const aggregate = await prisma.question.aggregate({
    _max: {
      realIndex: true,
    },
    where: {
      roundId,
    },
  });

  return (aggregate._max.realIndex ?? -1) + 1;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function validateImportQuestion(
  question: CompetitionImportQuestion,
  roundIndex: number,
  questionIndex: number,
): string | null {
  if (typeof question.questionText !== "string" || !question.questionText.trim()) {
    return `rounds[${roundIndex}].questions[${questionIndex}].questionText is required`;
  }
  if (!QUESTION_TYPES.has(question.type)) {
    return `rounds[${roundIndex}].questions[${questionIndex}].type is invalid`;
  }
  if (!isFiniteNumber(question.points)) {
    return `rounds[${roundIndex}].questions[${questionIndex}].points must be a number`;
  }
  if (!isFiniteNumber(question.timeLimitSeconds)) {
    return `rounds[${roundIndex}].questions[${questionIndex}].timeLimitSeconds must be a number`;
  }
  if (question.grading !== "AUTO" && question.grading !== "MANUAL") {
    return `rounds[${roundIndex}].questions[${questionIndex}].grading is invalid`;
  }
  if (typeof question.content !== "object" || question.content === null) {
    return `rounds[${roundIndex}].questions[${questionIndex}].content is required`;
  }
  if (question.source !== undefined && question.source !== null && typeof question.source !== "string") {
    return `rounds[${roundIndex}].questions[${questionIndex}].source must be a string`;
  }
  if (question.section !== undefined && typeof question.section !== "string") {
    return `rounds[${roundIndex}].questions[${questionIndex}].section must be a string`;
  }
  if (question.index !== undefined && !isFiniteNumber(question.index)) {
    return `rounds[${roundIndex}].questions[${questionIndex}].index must be a number`;
  }
  return null;
}

function validateImportRound(
  round: CompetitionImportRound,
  roundIndex: number,
): string | null {
  if (typeof round.title !== "string" || !round.title.trim()) {
    return `rounds[${roundIndex}].title is required`;
  }
  if (!ROUND_TYPES.has(round.type)) {
    return `rounds[${roundIndex}].type is invalid`;
  }
  if (!Array.isArray(round.questions) || round.questions.length === 0) {
    return `rounds[${roundIndex}].questions must be a non-empty array`;
  }
  for (let questionIndex = 0; questionIndex < round.questions.length; questionIndex += 1) {
    const error = validateImportQuestion(round.questions[questionIndex], roundIndex, questionIndex);
    if (error) {
      return error;
    }
  }
  return null;
}

function validateCompetitionImportDocument(body: unknown): {
  isValid: boolean;
  error?: string;
  document?: CompetitionImportDocument;
} {
  if (typeof body !== "object" || body === null) {
    return { isValid: false, error: "Request body must be an object" };
  }

  const document = body as CompetitionImportDocument;
  if (
    typeof document.competition !== "object" ||
    document.competition === null ||
    typeof document.competition.title !== "string" ||
    !document.competition.title.trim()
  ) {
    return { isValid: false, error: "competition.title is required" };
  }
  if (
    document.competition.status !== undefined &&
    !COMPETITION_STATUSES.has(document.competition.status as CompetitionStatus)
  ) {
    return { isValid: false, error: "competition.status is invalid" };
  }

  if (!Array.isArray(document.rounds) || document.rounds.length === 0) {
    return { isValid: false, error: "rounds must be a non-empty array" };
  }

  for (let roundIndex = 0; roundIndex < document.rounds.length; roundIndex += 1) {
    const error = validateImportRound(document.rounds[roundIndex], roundIndex);
    if (error) {
      return { isValid: false, error };
    }
  }

  return { isValid: true, document };
}

// Apply auth middleware to all admin routes
router.use(authMiddleware);

// --- COMPETITIONS ---
router.get("/competitions", async (req, res) => {
  try {
    const competitions = await prisma.competition.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(competitions);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/competitions", async (req, res) => {
  const { title, host_pin } = req.body;
  try {
    const competition = await prisma.competition.create({
      data: { title, host_pin },
    });
    res.status(201).json(competition);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/competitions/import", async (req, res) => {
  const validation = validateCompetitionImportDocument(req.body);
  if (!validation.isValid || !validation.document) {
    res.status(400).json({
      error: "INVALID_IMPORT_DOCUMENT",
      message: validation.error ?? "Invalid import document",
    });
    return;
  }

  const importDocument = validation.document;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const createdCompetition = await transaction.competition.create({
        data: {
          title: importDocument.competition.title.trim(),
          host_pin:
            typeof importDocument.competition.host_pin === "string" &&
            importDocument.competition.host_pin.trim()
              ? importDocument.competition.host_pin.trim()
              : "1234",
          status: (importDocument.competition.status ?? "DRAFT") as CompetitionStatus,
          milestones: importDocument.competition.milestones
            ? toPrismaJson(importDocument.competition.milestones)
            : undefined,
        },
      });

      let createdRounds = 0;
      let createdQuestions = 0;

      for (let roundOrder = 0; roundOrder < importDocument.rounds.length; roundOrder += 1) {
        const roundImport = importDocument.rounds[roundOrder];
        const createdRound = await transaction.round.create({
          data: {
            competitionId: createdCompetition.id,
            title: roundImport.title.trim(),
            type: roundImport.type as RoundType,
            orderIndex: roundOrder + 1,
          },
        });
        createdRounds += 1;

        const nextIndexBySection = new Map<string, number>();

        for (let questionOrder = 0; questionOrder < roundImport.questions.length; questionOrder += 1) {
          const questionImport = roundImport.questions[questionOrder];
          const normalizedSection =
            typeof questionImport.section === "string" && questionImport.section.trim()
              ? questionImport.section.trim()
              : null;
          const sectionKey = normalizedSection ?? "__null__";
          const fallbackSectionIndex = nextIndexBySection.get(sectionKey) ?? 0;
          const resolvedIndex =
            typeof questionImport.index === "number" ? questionImport.index : fallbackSectionIndex;

          await transaction.question.create({
            data: {
              roundId: createdRound.id,
              questionText: questionImport.questionText,
              source:
                typeof questionImport.source === "string" && questionImport.source.trim()
                  ? questionImport.source.trim()
                  : null,
              type: questionImport.type as QuestionType,
              points: questionImport.points,
              timeLimitSeconds: questionImport.timeLimitSeconds,
              content: toPrismaJson(questionImport.content),
              grading: questionImport.grading as GradingMode,
              section: normalizedSection,
              index: resolvedIndex,
              realIndex: questionOrder,
            },
          });

          nextIndexBySection.set(sectionKey, resolvedIndex + 1);
          createdQuestions += 1;
        }
      }

      return {
        id: createdCompetition.id,
        title: createdCompetition.title,
        roundsCreated: createdRounds,
        questionsCreated: createdQuestions,
      };
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/competitions/:id", async (req, res) => {
  const { id } = req.params;
  const { title, status, host_pin } = req.body;
  try {
    const competition = await prisma.competition.update({
      where: { id },
      data: {
        title,
        status: status as CompetitionStatus,
        host_pin,
      },
    });
    res.json(competition);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/competitions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        rounds: {
          orderBy: { orderIndex: "asc" },
          include: {
            questions: {
              orderBy: [
                { realIndex: "asc" },
                { index: "asc" },
                { createdAt: "asc" },
              ],
            },
          },
        },
      },
    });
    res.json(competition);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/competitions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.competition.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- ROUNDS ---
router.get("/competitions/:id/rounds", async (req, res) => {
  const { id } = req.params;
  try {
    const rounds = await prisma.round.findMany({
      where: { competitionId: id },
      orderBy: { orderIndex: "asc" },
    });
    res.json(rounds);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/rounds", async (req, res) => {
  const { competitionId, title, type, orderIndex } = req.body;
  try {
    const round = await prisma.round.create({
      data: {
        competitionId,
        title,
        type: type as RoundType,
        orderIndex,
      },
    });
    res.status(201).json(round);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/rounds/:id", async (req, res) => {
  const { id } = req.params;
  const { title, type, orderIndex } = req.body;
  try {
    const round = await prisma.round.update({
      where: { id },
      data: {
        title,
        type: type as RoundType,
        orderIndex,
      },
    });
    res.json(round);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/rounds/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.round.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- QUESTIONS ---
router.get("/rounds/:id/questions", async (req, res) => {
  const { id } = req.params;
  try {
    const questions = await prisma.question.findMany({
      where: { roundId: id },
      orderBy: [
        { realIndex: "asc" },
        { index: "asc" },
        { createdAt: "asc" },
      ],
    });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/questions", async (req, res) => {
  const {
    roundId,
    questionText,
    source,
    type,
    points,
    timeLimitSeconds,
    content,
    grading,
    section,
    index,
    realIndex,
  } = req.body;
  try {
    const normalizedSection = typeof section === "string" && section.trim() ? section.trim() : null;
    const resolvedIndex =
      typeof index === "number"
        ? index
        : await getNextQuestionIndex(roundId, normalizedSection);
    const resolvedRealIndex =
      typeof realIndex === "number" ? realIndex : await getNextRealIndex(roundId);

    const question = await prisma.question.create({
      data: {
        roundId,
        questionText,
        source: typeof source === "string" && source.trim() ? source.trim() : null,
        type: type as QuestionType,
        points,
        timeLimitSeconds,
        content,
        grading: grading as GradingMode,
        section: normalizedSection,
        index: resolvedIndex,
        realIndex: resolvedRealIndex,
      },
    });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/questions/:id", async (req, res) => {
  const { id } = req.params;
  const {
    questionText,
    source,
    type,
    points,
    timeLimitSeconds,
    content,
    grading,
    section,
    index,
    realIndex,
  } =
    req.body;
  try {
    const existingQuestion = await prisma.question.findUnique({
      where: { id },
      select: {
        roundId: true,
        section: true,
        source: true,
        index: true,
        realIndex: true,
      },
    });

    if (!existingQuestion) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    const normalizedSection = typeof section === "string" ? section.trim() || null : existingQuestion.section;
    const sectionChanged = normalizedSection !== existingQuestion.section;
    const resolvedIndex =
      typeof index === "number"
        ? index
        : sectionChanged
          ? await getNextQuestionIndex(existingQuestion.roundId, normalizedSection)
          : existingQuestion.index;

    const question = await prisma.question.update({
      where: { id },
      data: {
        questionText,
        source:
          typeof source === "string"
            ? source.trim() || null
            : existingQuestion.source,
        type: type as QuestionType,
        points,
        timeLimitSeconds,
        content,
        grading: grading as GradingMode,
        section: normalizedSection,
        index: resolvedIndex,
        realIndex:
          typeof realIndex === "number" ? realIndex : existingQuestion.realIndex,
      },
    });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/questions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.question.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

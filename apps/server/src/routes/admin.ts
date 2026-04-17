import { Router } from "express";
import prisma from "../db/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  CompetitionStatus,
  QuestionType,
  RoundType,
  GradingMode,
} from "@prisma/client";

const router = Router();

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
                { section: "asc" },
                { realIndex: "asc" },
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
        { section: "asc" },
        { realIndex: "asc" },
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

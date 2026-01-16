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
              orderBy: { createdAt: "asc" },
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
      orderBy: { createdAt: "asc" },
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
  } = req.body;
  try {
    const question = await prisma.question.create({
      data: {
        roundId,
        questionText,
        type: type as QuestionType,
        points,
        timeLimitSeconds,
        content,
        grading: grading as GradingMode,
      },
    });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/questions/:id", async (req, res) => {
  const { id } = req.params;
  const { questionText, type, points, timeLimitSeconds, content, grading } =
    req.body;
  try {
    const question = await prisma.question.update({
      where: { id },
      data: {
        questionText,
        type: type as QuestionType,
        points,
        timeLimitSeconds,
        content,
        grading: grading as GradingMode,
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

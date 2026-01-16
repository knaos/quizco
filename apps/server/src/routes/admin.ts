import { Router } from "express";
import prisma from "../db/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  competition_status,
  question_type,
  round_type,
  grading_mode,
} from "@prisma/client";

const router = Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);

// --- COMPETITIONS ---
router.get("/competitions", async (req, res) => {
  try {
    const competitions = await prisma.competitions.findMany({
      orderBy: { created_at: "desc" },
    });
    res.json(competitions);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/competitions", async (req, res) => {
  const { title, host_pin } = req.body;
  try {
    const competition = await prisma.competitions.create({
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
    const competition = await prisma.competitions.update({
      where: { id },
      data: {
        title,
        status: status as competition_status,
        host_pin,
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
    await prisma.competitions.delete({
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
    const rounds = await prisma.rounds.findMany({
      where: { competition_id: id },
      orderBy: { order_index: "asc" },
    });
    res.json(rounds);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/rounds", async (req, res) => {
  const { competition_id, title, type, order_index } = req.body;
  try {
    const round = await prisma.rounds.create({
      data: {
        competition_id,
        title,
        type: type as round_type,
        order_index,
      },
    });
    res.status(201).json(round);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/rounds/:id", async (req, res) => {
  const { id } = req.params;
  const { title, type, order_index } = req.body;
  try {
    const round = await prisma.rounds.update({
      where: { id },
      data: {
        title,
        type: type as round_type,
        order_index,
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
    await prisma.rounds.delete({
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
    const questions = await prisma.questions.findMany({
      where: { round_id: id },
      orderBy: { created_at: "asc" },
    });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/questions", async (req, res) => {
  const {
    round_id,
    question_text,
    type,
    points,
    time_limit_seconds,
    content,
    grading,
  } = req.body;
  try {
    const question = await prisma.questions.create({
      data: {
        round_id,
        question_text,
        type: type as question_type,
        points,
        time_limit_seconds,
        content,
        grading: grading as grading_mode,
      },
    });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/questions/:id", async (req, res) => {
  const { id } = req.params;
  const { question_text, type, points, time_limit_seconds, content, grading } =
    req.body;
  try {
    const question = await prisma.questions.update({
      where: { id },
      data: {
        question_text,
        type: type as question_type,
        points,
        time_limit_seconds,
        content,
        grading: grading as grading_mode,
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
    await prisma.questions.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

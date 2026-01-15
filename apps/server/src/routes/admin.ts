import { Router } from "express";
import { query } from "../db";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);

// --- COMPETITIONS ---
router.get("/competitions", async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT * FROM competitions ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/competitions", async (req, res) => {
  const { title, host_pin } = req.body;
  try {
    const { rows } = await query(
      "INSERT INTO competitions (title, host_pin) VALUES ($1, $2) RETURNING *",
      [title, host_pin]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/competitions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM competitions WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- ROUNDS ---
router.get("/competitions/:id/rounds", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      "SELECT * FROM rounds WHERE competition_id = $1 ORDER BY order_index",
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/rounds", async (req, res) => {
  const { competition_id, title, type, order_index } = req.body;
  try {
    const { rows } = await query(
      "INSERT INTO rounds (competition_id, title, type, order_index) VALUES ($1, $2, $3, $4) RETURNING *",
      [competition_id, title, type, order_index]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- QUESTIONS ---
router.get("/rounds/:id/questions", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(
      "SELECT * FROM questions WHERE round_id = $1 ORDER BY created_at",
      [id]
    );
    res.json(rows);
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
    const { rows } = await query(
      `INSERT INTO questions (round_id, question_text, type, points, time_limit_seconds, content, grading) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        round_id,
        question_text,
        type,
        points,
        time_limit_seconds,
        content,
        grading,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/questions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM questions WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { GameManager } from "./GameManager";
import adminRouter from "./routes/admin";
import { query } from "./db";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/admin", adminRouter);

// Public/Host Routes
app.get("/api/competitions", async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT id, title, status FROM competitions WHERE status = 'ACTIVE' OR status = 'DRAFT' ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/competitions/:id/play-data", async (req, res) => {
  const { id } = req.params;
  try {
    const roundsRes = await query(
      "SELECT * FROM rounds WHERE competition_id = $1 ORDER BY order_index",
      [id]
    );
    const rounds = roundsRes.rows;

    for (const round of rounds) {
      const qRes = await query(
        "SELECT * FROM questions WHERE round_id = $1 ORDER BY created_at",
        [round.id]
      );
      round.questions = qRes.rows;
    }

    res.json({ rounds });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const gameManager = new GameManager();

app.get("/api/questions", async (req, res) => {
  const competitionId = req.query.competitionId as string;
  if (competitionId) {
    const { rows } = await gameManager.getQuestionsForCompetition(
      competitionId
    );
    return res.json(rows);
  }
  const { rows } = await gameManager.getAllQuestions();
  res.json(rows);
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("HOST_JOIN_ROOM", ({ competitionId }) => {
    if (!competitionId) return;

    // Leave any other competition rooms
    for (const room of socket.rooms) {
      if (room.startsWith("competition_")) {
        socket.leave(room);
      }
    }

    const room = `competition_${competitionId}`;
    socket.join(room);
    socket.emit("GAME_STATE_SYNC", gameManager.getState(competitionId));
    console.log(`Host joined room: ${room}`);
  });

  socket.on(
    "JOIN_ROOM",
    async ({ competitionId, teamName, color }, callback) => {
      if (!competitionId)
        return callback?.({ success: false, error: "Missing competitionId" });

      const team = await gameManager.addTeam(competitionId, teamName, color);
      const room = `competition_${competitionId}`;
      socket.join(room);

      const state = gameManager.getState(competitionId);
      socket.emit("GAME_STATE_SYNC", state);
      io.to(room).emit("SCORE_UPDATE", state.teams);
      if (callback) callback({ success: true, team });
    }
  );

  socket.on("RECONNECT_TEAM", async ({ competitionId, teamId }, callback) => {
    if (!competitionId || !teamId) return callback?.({ success: false });

    const team = await gameManager.reconnectTeam(competitionId, teamId);
    if (team) {
      const room = `competition_${competitionId}`;
      socket.join(room);
      socket.emit("GAME_STATE_SYNC", gameManager.getState(competitionId));
      if (callback) callback({ success: true, team });
    } else {
      if (callback) callback({ success: false });
    }
  });

  socket.on(
    "SUBMIT_ANSWER",
    async ({ competitionId, teamId, questionId, answer }) => {
      if (!competitionId) return;
      await gameManager.submitAnswer(competitionId, teamId, questionId, answer);
      const state = gameManager.getState(competitionId);
      const room = `competition_${competitionId}`;
      io.to(room).emit("GAME_STATE_SYNC", state);
      io.to(room).emit("SCORE_UPDATE", state.teams);
    }
  );

  socket.on("HOST_START_QUESTION", async ({ competitionId, questionId }) => {
    if (!competitionId) return;
    await gameManager.startQuestion(competitionId, questionId);
    io.to(`competition_${competitionId}`).emit(
      "GAME_STATE_SYNC",
      gameManager.getState(competitionId)
    );
  });

  socket.on("HOST_START_TIMER", ({ competitionId }) => {
    if (!competitionId) return;
    const room = `competition_${competitionId}`;
    gameManager.startTimer(competitionId, (state) => {
      io.to(room).emit("TIMER_SYNC", state.timeRemaining);
      if (state.timeRemaining === 0) {
        io.to(room).emit("GAME_STATE_SYNC", state);
      }
    });
    io.to(room).emit("GAME_STATE_SYNC", gameManager.getState(competitionId));
  });

  socket.on("HOST_REVEAL_ANSWER", ({ competitionId }) => {
    if (!competitionId) return;
    gameManager.revealAnswer(competitionId);
    io.to(`competition_${competitionId}`).emit(
      "GAME_STATE_SYNC",
      gameManager.getState(competitionId)
    );
  });

  socket.on(
    "HOST_GRADE_DECISION",
    async ({ competitionId, answerId, correct }) => {
      if (!competitionId) return;
      await gameManager.handleGradeDecision(competitionId, answerId, correct);
      const state = gameManager.getState(competitionId);
      const room = `competition_${competitionId}`;
      io.to(room).emit("SCORE_UPDATE", state.teams);
      io.to(room).emit("GAME_STATE_SYNC", state);
    }
  );

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.get("/api/admin/pending-answers", async (req, res) => {
  const competitionId = req.query.competitionId as string;
  try {
    let sql = `SELECT a.*, t.name as team_name, q.question_text 
               FROM answers a 
               JOIN teams t ON a.team_id = t.id 
               JOIN questions q ON a.question_id = q.id 
               WHERE a.is_correct IS NULL`;
    const params: any[] = [];

    if (competitionId) {
      sql += ` AND q.round_id IN (SELECT id FROM rounds WHERE competition_id = $1)`;
      params.push(competitionId);
    }

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

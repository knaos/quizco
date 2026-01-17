import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import adminRouter from "./routes/admin";
import { GameManager } from "./GameManager";
import { IGameRepository } from "./repositories/IGameRepository";
import prisma from "./db/prisma";

export function createQuizServer(
  gameManager: GameManager,
  repository: IGameRepository,
) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use("/api/admin", adminRouter);

  // Public/Host Routes
  app.get("/api/competitions", async (req, res) => {
    try {
      const competitions = await prisma.competition.findMany({
        where: {
          OR: [{ status: "ACTIVE" }, { status: "DRAFT" }],
        },
        select: {
          id: true,
          title: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(competitions);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/competitions/:id/play-data", async (req, res) => {
    const { id } = req.params;
    try {
      const rounds = await prisma.round.findMany({
        where: { competitionId: id },
        orderBy: { orderIndex: "asc" },
        include: {
          questions: {
            orderBy: { createdAt: "asc" },
            include: {
              answers: true,
            },
          },
        },
      });

      res.json({ rounds });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/questions", async (req, res) => {
    const competitionId = req.query.competitionId as string;
    if (competitionId) {
      const rows = await gameManager.getQuestionsForCompetition(competitionId);
      return res.json(rows);
    }
    const rows = await gameManager.getAllQuestions();
    res.json(rows);
  });

  app.get("/api/admin/pending-answers", async (req, res) => {
    const competitionId = req.query.competitionId as string;
    try {
      const rows = await repository.getPendingAnswers(competitionId);
      res.json(rows);
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
      },
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
      async ({ competitionId, teamId, questionId, answer }, callback) => {
        if (!competitionId) {
          callback?.({ success: false, error: "Missing competitionId" });
          return;
        }
        try {
          await gameManager.submitAnswer(
            competitionId,
            teamId,
            questionId,
            answer,
          );
          const state = gameManager.getState(competitionId);
          const room = `competition_${competitionId}`;
          io.to(room).emit("GAME_STATE_SYNC", state);
          io.to(room).emit("SCORE_UPDATE", state.teams);
          callback?.({ success: true });
        } catch (err) {
          console.error("Error submitting answer:", err);
          callback?.({ success: false, error: (err as Error).message });
        }
      },
    );

    socket.on("HOST_START_QUESTION", async ({ competitionId, questionId }) => {
      if (!competitionId) return;
      await gameManager.startQuestion(competitionId, questionId);
      io.to(`competition_${competitionId}`).emit(
        "GAME_STATE_SYNC",
        gameManager.getState(competitionId),
      );
    });

    socket.on("HOST_START_TIMER", ({ competitionId }) => {
      if (!competitionId) return;
      const room = `competition_${competitionId}`;
      const state = gameManager.getState(competitionId);
      const duration = state.currentQuestion?.timeLimitSeconds ?? 30;

      gameManager.startTimer(competitionId, duration, (state) => {
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
        gameManager.getState(competitionId),
      );
    });

    socket.on("HOST_NEXT", async ({ competitionId }) => {
      if (!competitionId) return;
      const room = `competition_${competitionId}`;
      await gameManager.next(competitionId, (state) => {
        io.to(room).emit("TIMER_SYNC", state.timeRemaining);
        if (state.timeRemaining === 0) {
          io.to(room).emit("GAME_STATE_SYNC", state);
        }
      });
      io.to(room).emit("GAME_STATE_SYNC", gameManager.getState(competitionId));
    });

    socket.on("HOST_SET_PHASE", async ({ competitionId, phase }) => {
      if (!competitionId) return;
      await gameManager.setPhase(competitionId, phase);
      io.to(`competition_${competitionId}`).emit(
        "GAME_STATE_SYNC",
        gameManager.getState(competitionId),
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
      },
    );

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return { app, httpServer, io };
}

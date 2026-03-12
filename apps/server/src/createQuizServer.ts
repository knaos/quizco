import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import adminRouter from "./routes/admin";
import { GameManager } from "./GameManager";
import { IGameRepository } from "./repositories/IGameRepository";
import prisma from "./db/prisma";
import { Logger } from "./utils/Logger";
import { withErrorLogging } from "./utils/safeHandler";

export function createQuizServer(
  gameManager: GameManager,
  repository: IGameRepository,
) {
  const logger = new Logger("QuizServer");
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
    try {
      if (competitionId) {
        const rows = await gameManager.getQuestionsForCompetition(competitionId);
        return res.json(rows);
      }
      const rows = await gameManager.getAllQuestions();
      res.json(rows);
    } catch (err) {
      logger.error("Failed to fetch questions", err);
      res.status(500).json({ error: (err as Error).message });
    }
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

  app.get(
    "/api/competitions/:id/questions/:questionId/answers",
    async (req, res) => {
      const { id, questionId } = req.params;
      try {
        const formatted = await repository.getQuestionAnswers(id, questionId);
        console.log(`API Answers for ${questionId}:`, formatted);
        res.json(formatted);
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    },
  );

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const socketToTeam = new Map<
    string,
    { competitionId: string; teamId: string }
  >();
  const teamToSocket = new Map<string, string>(); // teamId -> socketId

  // Monitoring loop: check connections every second
  setInterval(() => {
    try {
      for (const [teamId, socketId] of teamToSocket.entries()) {
        const socket = io.sockets.sockets.get(socketId);
        const info = socketToTeam.get(socketId);

        if (!socket || !socket.connected) {
          if (info) {
            const changed = gameManager.updateTeamConnection(
              info.competitionId,
              info.teamId,
              false,
            );
            if (changed) {
              const room = `competition_${info.competitionId}`;
              io.to(room).emit(
                "SCORE_UPDATE",
                gameManager.getState(info.competitionId).teams,
              );
            }
          }
          teamToSocket.delete(teamId);
        }
      }
    } catch (error) {
      logger.error("Connection monitoring loop failed", error);
    }
  }, 1000);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    const onSafe = <TArgs extends unknown[]>(
      eventName: string,
      handler: (...args: TArgs) => void | Promise<void>,
    ) => {
      socket.on(eventName, withErrorLogging(logger, `socket:${eventName}`, handler));
    };

    onSafe("HOST_JOIN_ROOM", ({ competitionId }) => {
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

    onSafe(
      "JOIN_ROOM",
      async (
        { competitionId, teamName, color },
        callback?: (response: {
          success: boolean;
          error?: string;
          team?: { id: string; name: string; color: string; score: number };
        }) => void,
      ) => {
        if (!competitionId)
          return callback?.({ success: false, error: "Missing competitionId" });

        const team = await gameManager.addTeam(competitionId, teamName, color);
        socketToTeam.set(socket.id, { competitionId, teamId: team.id });
        teamToSocket.set(team.id, socket.id);

        const room = `competition_${competitionId}`;
        socket.join(room);

        const state = gameManager.getState(competitionId);
        socket.emit("GAME_STATE_SYNC", state);
        io.to(room).emit("SCORE_UPDATE", state.teams);
        if (callback) callback({ success: true, team });
      },
    );

    onSafe(
      "RECONNECT_TEAM",
      async (
        { competitionId, teamId },
        callback?: (response: {
          success: boolean;
          team?: { id: string; name: string; color: string; score: number };
        }) => void,
      ) => {
      if (!competitionId || !teamId) return callback?.({ success: false });

      const team = await gameManager.reconnectTeam(competitionId, teamId);
      if (team) {
        socketToTeam.set(socket.id, { competitionId, teamId: team.id });
        teamToSocket.set(team.id, socket.id);

        const room = `competition_${competitionId}`;
        socket.join(room);

        const state = gameManager.getState(competitionId);
        socket.emit("GAME_STATE_SYNC", state);
        io.to(room).emit("SCORE_UPDATE", state.teams);
        if (callback) callback({ success: true, team });
      } else {
        if (callback) callback({ success: false });
      }
      },
    );

    onSafe(
      "SUBMIT_ANSWER",
      async (
        { competitionId, teamId, questionId, answer, isFinal },
        callback?: (response: {
          success: boolean;
          error?: string;
          questionEnded?: boolean;
        }) => void,
      ) => {
        if (!competitionId) {
          callback?.({ success: false, error: "Missing competitionId" });
          return;
        }
        try {
          const submitResult = await gameManager.submitAnswer(
            competitionId,
            teamId,
            questionId,
            answer,
            isFinal,
          );

          if (!submitResult.accepted) {
            callback?.({ success: false, error: submitResult.reason });
            return;
          }

          const state = gameManager.getState(competitionId);
          const room = `competition_${competitionId}`;
          if (submitResult.questionEnded) {
            io.to(room).emit("GAME_STATE_SYNC", state);
            io.to(room).emit("SCORE_UPDATE", state.teams);
          } else if (isFinal) {
            io.to(room).emit("GAME_STATE_SYNC", state);
          }
          callback?.({ success: true, questionEnded: submitResult.questionEnded });
        } catch (err) {
          console.error("Error submitting answer:", err);
          callback?.({ success: false, error: (err as Error).message });
        }
      },
    );

    onSafe(
      "REQUEST_JOKER",
      async ({ competitionId, teamId, questionId }) => {
        if (!competitionId) return;
        try {
          await gameManager.handleJokerReveal(
            competitionId,
            teamId,
            questionId,
            io,
          );
        } catch (err) {
          console.error("Error handling joker reveal:", err);
          socket.emit("JOKER_ERROR", { message: (err as Error).message });
        }
      },
    );

    onSafe("HOST_START_QUESTION", async ({ competitionId, questionId }) => {
      if (!competitionId) return;
      await gameManager.startQuestion(competitionId, questionId);
      io.to(`competition_${competitionId}`).emit(
        "GAME_STATE_SYNC",
        gameManager.getState(competitionId),
      );
    });

    onSafe("HOST_START_TIMER", ({ competitionId }) => {
      if (!competitionId) return;
      const room = `competition_${competitionId}`;
      const state = gameManager.getState(competitionId);
      const duration = state.currentQuestion?.timeLimitSeconds ?? 30;

      gameManager.startTimer(competitionId, duration, (state) => {
        try {
          io.to(room).emit("TIMER_SYNC", state.timeRemaining);
          if (state.timeRemaining === 0) {
            io.to(room).emit("GAME_STATE_SYNC", state);
          }
        } catch (error) {
          logger.error("Failed while broadcasting timer sync", error);
        }
      });
      io.to(room).emit("GAME_STATE_SYNC", gameManager.getState(competitionId));
    });

    onSafe("HOST_REVEAL_ANSWER", ({ competitionId }) => {
      if (!competitionId) return;
      gameManager.revealAnswer(competitionId);
      const state = gameManager.getState(competitionId);
      io.to(`competition_${competitionId}`).emit(
        "GAME_STATE_SYNC",
        state,
      );
      // Emit SCORE_UPDATE when revealing answer - scores are now updated
      io.to(`competition_${competitionId}`).emit("SCORE_UPDATE", state.teams);
    });

    onSafe("HOST_NEXT", async ({ competitionId }) => {
      if (!competitionId) return;
      const room = `competition_${competitionId}`;
      await gameManager.next(competitionId, (state) => {
        try {
          io.to(room).emit("TIMER_SYNC", state.timeRemaining);
          if (state.timeRemaining === 0) {
            io.to(room).emit("GAME_STATE_SYNC", state);
          }
        } catch (error) {
          logger.error("Failed while broadcasting next-state timer sync", error);
        }
      });
      io.to(room).emit("GAME_STATE_SYNC", gameManager.getState(competitionId));
    });

    onSafe("HOST_SET_PHASE", async ({ competitionId, phase }) => {
      if (!competitionId) return;
      await gameManager.setPhase(competitionId, phase);
      io.to(`competition_${competitionId}`).emit(
        "GAME_STATE_SYNC",
        gameManager.getState(competitionId),
      );
    });

    onSafe(
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

    onSafe("HOST_PAUSE_TIMER", async ({ competitionId }) => {
      if (!competitionId) return;
      await gameManager.pauseTimer(competitionId);
      io.to(`competition_${competitionId}`).emit(
        "GAME_STATE_SYNC",
        gameManager.getState(competitionId),
      );
    });

    onSafe("HOST_RESUME_TIMER", async ({ competitionId }) => {
      if (!competitionId) return;
      await gameManager.resumeTimer(competitionId);
      io.to(`competition_${competitionId}`).emit(
        "GAME_STATE_SYNC",
        gameManager.getState(competitionId),
      );
    });

    onSafe("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      const info = socketToTeam.get(socket.id);
      if (info) {
        const changed = gameManager.updateTeamConnection(
          info.competitionId,
          info.teamId,
          false,
        );
        if (changed) {
          const room = `competition_${info.competitionId}`;
          io.to(room).emit(
            "SCORE_UPDATE",
            gameManager.getState(info.competitionId).teams,
          );
        }
        socketToTeam.delete(socket.id);
        if (teamToSocket.get(info.teamId) === socket.id) {
          teamToSocket.delete(info.teamId);
        }
      }
    });
  });

  return { app, httpServer, io };
}

import express from "express";
import type { RequestHandler } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import adminRouter from "./routes/admin";
import { GameManager } from "./GameManager";
import { IGameRepository } from "./repositories/IGameRepository";
import prisma from "./db/prisma";
import { Logger } from "./utils/Logger";
import { withErrorLogging } from "./utils/safeHandler";
import {
  resolveClientDistPath,
  shouldServeClientRoute,
} from "./config/staticClient";
import { assertProductionSecurity, getSecurityConfig } from "./auth/config";
import { createLoginHandler, requireAuth, verifySocketAuthToken } from "./auth/http";

export function createQuizServer(
  gameManager: GameManager,
  repository: IGameRepository,
) {
  const logger = new Logger("QuizServer");
  const securityConfig = getSecurityConfig(process.env);
  assertProductionSecurity(securityConfig, process.env.NODE_ENV);
  const app = express();
  const corsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        securityConfig.allowedOrigins.length === 0 ||
        securityConfig.allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed"));
    },
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.post("/api/auth/login", createLoginHandler(securityConfig));

  const hostOrAdminAuth = requireAuth(securityConfig, ["host", "admin"]);

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
            orderBy: [
              { realIndex: "asc" },
              { index: "asc" },
              { createdAt: "asc" },
            ],
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

  app.get("/api/admin/pending-answers", hostOrAdminAuth as RequestHandler, async (req, res) => {
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
    hostOrAdminAuth as RequestHandler,
    async (req, res) => {
      const { id, questionId } = req.params;
      try {
        const formatted = await repository.getQuestionAnswers(id, questionId);
        res.json(formatted);
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    },
  );

  app.get(
    "/api/competitions/:id/questions/:questionId/audience-stats",
    async (req, res) => {
      const { id, questionId } = req.params;
      try {
        const rows = await repository.getQuestionAnswers(id, questionId);
        res.json(rows.map((row) => ({ isCorrect: row.isCorrect })));
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    },
  );

  const clientDistPath = resolveClientDistPath(
    process.cwd(),
    process.env.CLIENT_DIST_DIR,
  );
  const clientIndexPath = path.join(clientDistPath, "index.html");

  if (fs.existsSync(clientIndexPath)) {
    app.use(express.static(clientDistPath));
    app.get(/.*/, (req, res, next) => {
      if (!shouldServeClientRoute(req.path)) {
        next();
        return;
      }

      res.sendFile(clientIndexPath);
    });
    logger.info(`Serving client assets from ${clientDistPath}`);
  } else {
    logger.info(`Client assets not found at ${clientDistPath}; API-only mode`);
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: securityConfig.allowedOrigins.length > 0
        ? securityConfig.allowedOrigins
        : true,
      methods: ["GET", "POST"],
      credentials: true,
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

  const hasHostAccess = (authToken: string | undefined): boolean =>
    verifySocketAuthToken(authToken, securityConfig, ["host", "admin"]);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    const onSafe = <TArgs extends unknown[]>(
      eventName: string,
      handler: (...args: TArgs) => void | Promise<void>,
    ) => {
      socket.on(eventName, withErrorLogging(logger, `socket:${eventName}`, handler));
    };

    onSafe("PUBLIC_JOIN_ROOM", ({ competitionId }) => {
      if (!competitionId) return;

      for (const room of socket.rooms) {
        if (room.startsWith("competition_")) {
          socket.leave(room);
        }
      }

      const room = `competition_${competitionId}`;
      socket.join(room);
      socket.emit("GAME_STATE_SYNC", gameManager.getState(competitionId));
      console.log(`Viewer joined room: ${room}`);
    });

    onSafe("HOST_JOIN_ROOM", ({ competitionId, authToken }) => {
      if (!competitionId || !hasHostAccess(authToken)) {
        socket.emit("AUTH_ERROR", { message: "Unauthorized" });
        return;
      }

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

    onSafe("JOIN_ROOM",
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

        await gameManager.loadMilestones(competitionId);

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

          await gameManager.loadMilestones(competitionId);

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
      async ({ competitionId, teamId, questionId, x, y }) => {
        if (!competitionId) return;
        try {
          await gameManager.handleJokerReveal(
            competitionId,
            teamId,
            questionId,
            x,
            y,
            io,
            socket.id,
          );
        } catch (err) {
          console.error("Error handling joker reveal:", err);
          socket.emit("JOKER_ERROR", { message: (err as Error).message });
        }
      },
    );

    onSafe("HOST_START_QUESTION", async ({ competitionId, questionId, authToken }) => {
      if (!competitionId || !hasHostAccess(authToken)) {
        socket.emit("AUTH_ERROR", { message: "Unauthorized" });
        return;
      }
      await gameManager.startQuestion(competitionId, questionId);
      io.to(`competition_${competitionId}`).emit(
        "GAME_STATE_SYNC",
        gameManager.getState(competitionId),
      );
    });

    onSafe("HOST_START_TIMER", ({ competitionId, authToken }) => {
      if (!competitionId || !hasHostAccess(authToken)) {
        socket.emit("AUTH_ERROR", { message: "Unauthorized" });
        return;
      }
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

    onSafe("HOST_REVEAL_ANSWER", ({ competitionId, authToken }) => {
      if (!competitionId || !hasHostAccess(authToken)) {
        socket.emit("AUTH_ERROR", { message: "Unauthorized" });
        return;
      }
      gameManager.revealAnswer(competitionId);
      const state = gameManager.getState(competitionId);
      io.to(`competition_${competitionId}`).emit(
        "GAME_STATE_SYNC",
        state,
      );
      // Emit SCORE_UPDATE when revealing answer - scores are now updated
      io.to(`competition_${competitionId}`).emit("SCORE_UPDATE", state.teams);
    });

    onSafe("HOST_NEXT", async ({ competitionId, authToken }) => {
      if (!competitionId || !hasHostAccess(authToken)) {
        socket.emit("AUTH_ERROR", { message: "Unauthorized" });
        return;
      }
      const room = `competition_${competitionId}`;
      const newlyRevealed = await gameManager.next(competitionId, (state) => {
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
      if (newlyRevealed.length > 0) {
        io.to(room).emit("MILESTONES_REVEALED", {
          revealedIndices: newlyRevealed,
          totalPoints: gameManager.getTotalPoints(competitionId),
        });
      }
    });

    onSafe("HOST_SET_PHASE", async ({ competitionId, phase, authToken }) => {
      if (!competitionId || !hasHostAccess(authToken)) {
        socket.emit("AUTH_ERROR", { message: "Unauthorized" });
        return;
      }
      await gameManager.setPhase(competitionId, phase);
      io.to(`competition_${competitionId}`).emit(
        "GAME_STATE_SYNC",
        gameManager.getState(competitionId),
      );
    });

    onSafe(
      "HOST_GRADE_DECISION",
      async (
        {
          competitionId,
          answerId,
          correct,
          authToken,
        }: { competitionId: string; answerId: string; correct: boolean; authToken?: string },
        ack?: (result: { ok: boolean; error?: string }) => void,
      ) => {
        if (!competitionId || !hasHostAccess(authToken)) {
          socket.emit("AUTH_ERROR", { message: "Unauthorized" });
          ack?.({ ok: false, error: "Unauthorized" });
          return;
        }
        await gameManager.handleGradeDecision(competitionId, answerId, correct);
        const state = gameManager.getState(competitionId);
        const room = `competition_${competitionId}`;
        io.to(room).emit("SCORE_UPDATE", state.teams);
        io.to(room).emit("GAME_STATE_SYNC", state);
        ack?.({ ok: true });
      },
    );

    onSafe("HOST_PAUSE_TIMER", async ({ competitionId, authToken }) => {
      if (!competitionId || !hasHostAccess(authToken)) {
        socket.emit("AUTH_ERROR", { message: "Unauthorized" });
        return;
      }
      const room = `competition_${competitionId}`;
      await gameManager.pauseTimer(competitionId);
      const state = gameManager.getState(competitionId);
      io.to(room).emit("TIMER_SYNC", state.timeRemaining);
      io.to(room).emit(
        "GAME_STATE_SYNC",
        state,
      );
    });

    onSafe("HOST_RESUME_TIMER", async ({ competitionId, authToken }) => {
      if (!competitionId || !hasHostAccess(authToken)) {
        socket.emit("AUTH_ERROR", { message: "Unauthorized" });
        return;
      }
      const room = `competition_${competitionId}`;
      await gameManager.resumeTimer(competitionId, (state) => {
        try {
          io.to(room).emit("TIMER_SYNC", state.timeRemaining);
          io.to(room).emit("GAME_STATE_SYNC", state);
        } catch (error) {
          logger.error("Failed while broadcasting timer sync on resume", error);
        }
      });
      io.to(room).emit("GAME_STATE_SYNC", gameManager.getState(competitionId));
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

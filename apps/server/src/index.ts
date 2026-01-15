import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { GameManager } from "./GameManager";
import adminRouter from "./routes/admin";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/admin", adminRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, restrict this to local IP
    methods: ["GET", "POST"],
  },
});

const gameManager = new GameManager();

app.get("/api/questions", async (req, res) => {
  const { rows } = await gameManager.getAllQuestions();
  res.json(rows);
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Sync state on connection
  socket.emit("GAME_STATE_SYNC", gameManager.getState());

  socket.on("JOIN_ROOM", async ({ teamName, color }, callback) => {
    const team = await gameManager.addTeam(teamName, color);
    socket.join("competition_room");
    socket.emit("GAME_STATE_SYNC", gameManager.getState());
    io.emit("SCORE_UPDATE", gameManager.getState().teams);
    if (callback) callback({ success: true, team });
  });

  socket.on("RECONNECT_TEAM", async ({ teamId }, callback) => {
    const team = await gameManager.reconnectTeam(teamId);
    if (team) {
      socket.join("competition_room");
      socket.emit("GAME_STATE_SYNC", gameManager.getState());
      if (callback) callback({ success: true, team });
    } else {
      if (callback) callback({ success: false });
    }
  });

  socket.on("SUBMIT_ANSWER", async ({ teamId, questionId, answer }) => {
    await gameManager.submitAnswer(teamId, questionId, answer);
    io.emit("GAME_STATE_SYNC", gameManager.getState());
  });

  socket.on("HOST_START_QUESTION", async ({ questionId }) => {
    await gameManager.startQuestion(questionId);
    io.emit("GAME_STATE_SYNC", gameManager.getState());
  });

  socket.on("HOST_START_TIMER", () => {
    gameManager.startTimer();
    io.emit("GAME_STATE_SYNC", gameManager.getState());
  });

  socket.on("HOST_REVEAL_ANSWER", () => {
    gameManager.revealAnswer();
    io.emit("GAME_STATE_SYNC", gameManager.getState());
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Timer sync interval
setInterval(() => {
  const state = gameManager.getState();
  if (state.phase === "QUESTION_ACTIVE") {
    io.emit("TIMER_SYNC", state.timeRemaining);
    if (state.timeRemaining === 0) {
      io.emit("GAME_STATE_SYNC", state);
    }
  }
}, 1000);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

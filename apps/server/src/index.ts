import dotenv from "dotenv";
import { GameManager } from "./GameManager";
import { PostgresGameRepository } from "./repositories/PostgresGameRepository";
import { createQuizServer } from "./createQuizServer";
import { TimerService } from "./services/TimerService";
import { Logger } from "./utils/Logger";

dotenv.config();

const logger = new Logger("Server");
const repository = new PostgresGameRepository();
const timerService = new TimerService();
const gameManager = new GameManager(repository, timerService, logger);

const { httpServer } = createQuizServer(gameManager, repository);

const PORT = Number(process.env.PORT) || 4000;

gameManager
  .initialize()
  .then(() => {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Server running on port ${PORT} (accessible on local network)`,
      );
    });
  })
  .catch((err) => {
    console.error("Failed to initialize game manager:", err);
    process.exit(1);
  });

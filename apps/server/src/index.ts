import dotenv from "dotenv";
import { GameManager } from "./GameManager";
import { PostgresGameRepository } from "./repositories/PostgresGameRepository";
import { createQuizServer } from "./createQuizServer";

dotenv.config();

const repository = new PostgresGameRepository();
const gameManager = new GameManager(repository);

const { httpServer } = createQuizServer(gameManager, repository);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

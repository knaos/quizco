import fs from "fs/promises";
import path from "path";
import { GameState } from "@quizco/shared";

export class StatePersistenceService {
  private backupPath = path.resolve(process.cwd(), "backups/backup.json");

  async saveState(sessions: Map<string, GameState>) {
    // Serialize Map to Object
    const data = Object.fromEntries(sessions);
    try {
      await fs.mkdir(path.dirname(this.backupPath), { recursive: true });
      await fs.writeFile(this.backupPath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Failed to save state backup:", err);
    }
  }

  async loadState(): Promise<Map<string, GameState>> {
    try {
      // Check if file exists
      await fs.access(this.backupPath);
      const data = await fs.readFile(this.backupPath, "utf-8");
      const obj = JSON.parse(data);
      return new Map(Object.entries(obj));
    } catch (err) {
      // It's normal if backup doesn't exist on first run
      return new Map();
    }
  }
}

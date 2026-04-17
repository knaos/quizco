import type { FullConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup(_config: FullConfig): Promise<void> {
  execFileSync(
    "npx",
    ["prisma", "migrate", "deploy"],
    {
      cwd: path.resolve(__dirname, "../server"),
      stdio: "inherit",
    },
  );
}

export default globalSetup;

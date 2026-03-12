import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const currentFile = fileURLToPath(import.meta.url);
const e2eRoot = resolve(currentFile, "..", "..");
const candidateLastRunPaths = [
  join(e2eRoot, "test-results", "artifacts", ".last-run.json"),
  join(e2eRoot, "test-results", ".last-run.json"),
];
const npmRunner = process.platform === "win32" ? "npm.cmd" : "npm";

async function main() {
  let failedTests = [];
  let resolvedLastRunPath = null;

  for (const candidatePath of candidateLastRunPaths) {
    try {
      const fileContents = await readFile(candidatePath, "utf8");
      const lastRun = JSON.parse(fileContents);
      resolvedLastRunPath = candidatePath;
      if (Array.isArray(lastRun.failedTests)) {
        failedTests = lastRun.failedTests;
      }
      break;
    } catch {
      // Try next candidate.
    }
  }

  if (!resolvedLastRunPath) {
    console.log(
      `No last-run file found at ${candidateLastRunPaths.join(" or ")}`,
    );
    process.exit(0);
  }

  if (failedTests.length === 0) {
    console.log(`No failed tests recorded in ${resolvedLastRunPath}`);
    process.exit(0);
  }

  const result = spawnSync(`${npmRunner} exec playwright -- test --last-failed`, {
    cwd: e2eRoot,
    shell: true,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (typeof result.status === "number") {
    process.exit(result.status);
  }

  process.exit(1);
}

await main();

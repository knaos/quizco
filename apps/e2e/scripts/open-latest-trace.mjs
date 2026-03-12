import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const currentFile = fileURLToPath(import.meta.url);
const e2eRoot = resolve(currentFile, "..", "..");
const resultsLogPath = join(e2eRoot, "test-results", "logs", "results.json");
const isPrintOnly = process.argv.includes("--print-only");
const npmRunner = process.platform === "win32" ? "npm.cmd" : "npm";

async function getLatestTracePath() {
  let results;
  try {
    const raw = await readFile(resultsLogPath, "utf8");
    results = JSON.parse(raw);
  } catch {
    return null;
  }

  const tracePaths = [];
  const suites = Array.isArray(results?.suites) ? results.suites : [];

  const visitSuite = (suite) => {
    const specs = Array.isArray(suite?.specs) ? suite.specs : [];
    for (const spec of specs) {
      const tests = Array.isArray(spec?.tests) ? spec.tests : [];
      for (const run of tests) {
        const runResults = Array.isArray(run?.results) ? run.results : [];
        for (const runResult of runResults) {
          if (runResult?.status !== "failed" && runResult?.status !== "timedOut") {
            continue;
          }

          const attachments = Array.isArray(runResult?.attachments)
            ? runResult.attachments
            : [];

          for (const attachment of attachments) {
            if (
              attachment?.name === "trace" &&
              typeof attachment.path === "string" &&
              attachment.path.length > 0
            ) {
              tracePaths.push(attachment.path);
            }
          }
        }
      }
    }

    const childSuites = Array.isArray(suite?.suites) ? suite.suites : [];
    for (const childSuite of childSuites) {
      visitSuite(childSuite);
    }
  };

  for (const suite of suites) {
    visitSuite(suite);
  }

  if (tracePaths.length === 0) {
    return null;
  }

  const tracesWithTimes = await Promise.all(tracePaths.map(async (tracePath) => ({
    tracePath,
    mtimeMs: (await stat(tracePath)).mtimeMs,
  })));

  tracesWithTimes.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return tracesWithTimes[0]?.tracePath ?? null;
}

const latestTracePath = await getLatestTracePath();

if (!latestTracePath) {
  console.error(`No failed trace found in ${resultsLogPath}`);
  process.exit(1);
}

if (isPrintOnly) {
  console.log(latestTracePath);
  process.exit(0);
}

const result = spawnSync(`${npmRunner} exec playwright -- show-trace "${latestTracePath}"`, {
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

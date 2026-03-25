import { defineConfig, devices } from "@playwright/test";

const shouldManageWebServers = process.env.PW_SKIP_WEBSERVER !== "1";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results/artifacts",
  preserveOutput: "always",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list", { printSteps: true }],
    ["html", { open: "never", outputFolder: "./test-results/html" }],
    ["json", { outputFile: "./test-results/logs/results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  globalSetup: "./global-setup.ts",
  webServer: shouldManageWebServers
    ? [
        {
          command: "npm run dev -w @quizco/server",
          cwd: "../..",
          url: "http://127.0.0.1:4000/api/competitions",
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: "npm run dev -w client -- --host 127.0.0.1 --port 4173",
          cwd: "../..",
          url: "http://127.0.0.1:4173",
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
      ]
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

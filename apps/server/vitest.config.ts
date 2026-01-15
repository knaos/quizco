import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: path.resolve(__dirname, "src/test/globalSetup.ts"),
    setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
    // Ensure tests run in the test database
    env: {
      DB_NAME: "quizco_test",
    },
    poolOptions: {
      threads: {
        singleThread: true, // DB tests often need to run sequentially
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

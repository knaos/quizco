import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: path.resolve(__dirname, "src/test/globalSetup.ts"),
    setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
    poolOptions: {
      threads: {
        singleThread: true, // DB tests often need to run sequentially
      },
    },
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

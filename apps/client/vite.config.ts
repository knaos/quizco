import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const serverPort = Number(process.env.QUIZCO_SERVER_PORT ?? 4000);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [".ngrok-free.dev"],
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${serverPort}`,
        changeOrigin: true,
      },
      "/socket.io": {
        target: `http://127.0.0.1:${serverPort}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});

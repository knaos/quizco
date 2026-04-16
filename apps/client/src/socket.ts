import { io } from "socket.io-client";
import { resolveApiUrl } from "./config/network";

export const API_URL = resolveApiUrl(
  window.location,
  import.meta.env.VITE_API_URL,
);
export const socket = io(API_URL);

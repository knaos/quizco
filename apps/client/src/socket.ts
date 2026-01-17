import { io } from "socket.io-client";

export const API_URL = `http://${window.location.hostname}:4000`;
export const socket = io(API_URL);

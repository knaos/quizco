import dotenv from "dotenv";
import { getSecurityConfig } from "../auth/config";
import { requireAuth } from "../auth/http";

dotenv.config();

const securityConfig = getSecurityConfig(process.env);

export const authMiddleware = requireAuth(securityConfig, ["admin"]);

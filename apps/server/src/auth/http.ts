import { NextFunction, Request, Response } from "express";
import { SecurityConfig } from "./config";
import { AuthRole, issueAuthToken, verifyAuthToken } from "./token";

export interface AuthenticatedRequest extends Request {
  auth?: {
    role: AuthRole;
  };
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

export function createLoginHandler(config: SecurityConfig) {
  return (
    req: Request,
    res: Response,
  ) => {
    const { role, password } = req.body as {
      role?: AuthRole;
      password?: string;
    };

    if ((role !== "host" && role !== "admin") || typeof password !== "string") {
      res.status(400).json({ error: "Invalid login request" });
      return;
    }

    const expectedPassword = role === "host" ? config.hostPassword : config.adminPassword;
    if (password !== expectedPassword) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = issueAuthToken(role, config.tokenSecret, config.tokenTtlSeconds);
    res.json({
      token,
      role,
      expiresInSeconds: config.tokenTtlSeconds,
    });
  };
}

export function requireAuth(config: SecurityConfig, allowedRoles: AuthRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const payload = verifyAuthToken(token, config.tokenSecret);
    if (!payload || !allowedRoles.includes(payload.role)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.auth = { role: payload.role };
    next();
  };
}

export function verifySocketAuthToken(
  token: string | undefined,
  config: SecurityConfig,
  allowedRoles: AuthRole[],
): boolean {
  if (!token) {
    return false;
  }
  const payload = verifyAuthToken(token, config.tokenSecret);
  return !!payload && allowedRoles.includes(payload.role);
}

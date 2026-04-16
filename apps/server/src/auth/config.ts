import { AuthRole } from "./token";

const DEFAULT_HOST_PASSWORD = "host123";
const DEFAULT_ADMIN_PASSWORD = "admin123";
const DEFAULT_TOKEN_SECRET = "dev-only-secret";

export interface SecurityConfig {
  hostPassword: string;
  adminPassword: string;
  tokenSecret: string;
  tokenTtlSeconds: number;
  allowedOrigins: string[];
}

function splitOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getSecurityConfig(env: NodeJS.ProcessEnv): SecurityConfig {
  return {
    hostPassword: env.HOST_PASSWORD || DEFAULT_HOST_PASSWORD,
    adminPassword: env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
    tokenSecret: env.AUTH_TOKEN_SECRET || DEFAULT_TOKEN_SECRET,
    tokenTtlSeconds: Number(env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 12),
    allowedOrigins: splitOrigins(env.ALLOWED_ORIGINS),
  };
}

export function assertProductionSecurity(config: SecurityConfig, nodeEnv?: string): void {
  if (nodeEnv !== "production") {
    return;
  }

  const errors: string[] = [];

  if (config.hostPassword === DEFAULT_HOST_PASSWORD) {
    errors.push("HOST_PASSWORD must be changed in production");
  }
  if (config.adminPassword === DEFAULT_ADMIN_PASSWORD) {
    errors.push("ADMIN_PASSWORD must be changed in production");
  }
  if (config.tokenSecret === DEFAULT_TOKEN_SECRET) {
    errors.push("AUTH_TOKEN_SECRET must be set in production");
  }
  if (config.allowedOrigins.length === 0) {
    errors.push("ALLOWED_ORIGINS must be configured in production");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

export function getPasswordForRole(config: SecurityConfig, role: AuthRole): string {
  return role === "host" ? config.hostPassword : config.adminPassword;
}

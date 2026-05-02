import { getSecurityConfig } from "../auth/config";
import { issueAuthToken } from "../auth/token";

export function createHostTestToken(): string {
  const config = getSecurityConfig(process.env);
  return issueAuthToken("host", config.tokenSecret, config.tokenTtlSeconds);
}

export function createAdminTestToken(): string {
  const config = getSecurityConfig(process.env);
  return issueAuthToken("admin", config.tokenSecret, config.tokenTtlSeconds);
}

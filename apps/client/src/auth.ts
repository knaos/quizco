import { API_URL } from "./socket";

export type AuthRole = "host" | "admin";

export interface LoginResponse {
  token: string;
  role: AuthRole;
  expiresInSeconds: number;
}

export async function loginWithPassword(
  role: AuthRole,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role, password }),
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? "Unauthorized" : "Login failed");
  }

  return response.json() as Promise<LoginResponse>;
}

export function createAuthHeaders(token: string | null, includeJson = false): HeadersInit {
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

import { describe, expect, it } from "vitest";
import { issueAuthToken, verifyAuthToken } from "./token";

describe("auth token helpers", () => {
  it("issues and verifies a valid token", () => {
    const token = issueAuthToken("host", "secret", 60, 1_000);
    expect(verifyAuthToken(token, "secret", 30_000)).toEqual({
      role: "host",
      exp: 61_000,
    });
  });

  it("rejects expired tokens", () => {
    const token = issueAuthToken("admin", "secret", 1, 1_000);
    expect(verifyAuthToken(token, "secret", 3_000)).toBeNull();
  });

  it("rejects tokens signed with the wrong secret", () => {
    const token = issueAuthToken("admin", "secret", 60, 1_000);
    expect(verifyAuthToken(token, "other-secret", 2_000)).toBeNull();
  });
});

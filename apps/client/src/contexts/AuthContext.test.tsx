import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";
import { renderHook } from "../hooks/testUtils";

vi.mock("../auth", () => ({
  loginWithPassword: vi.fn(async (role: "host" | "admin", password: string) => {
    if (password === "wrong") {
      throw new Error("Unauthorized");
    }

    return {
      token: `${role}-token`,
      role,
      expiresInSeconds: 3600,
    };
  }),
}));

describe("AuthProvider", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("stores the host token in session storage after login", async () => {
    const view = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await expect(view.result.loginHost("secret")).resolves.toBe(true);
    });

    expect(window.sessionStorage.getItem("quizco_host_token")).toBe("host-token");
    expect(view.result.isHostAuthenticated).toBe(true);
    view.unmount();
  });

  it("keeps admin unauthenticated when login fails", async () => {
    const view = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await expect(view.result.loginAdmin("wrong")).resolves.toBe(false);
    });

    expect(window.sessionStorage.getItem("quizco_admin_token")).toBeNull();
    expect(view.result.isAdminAuthenticated).toBe(false);
    view.unmount();
  });
});

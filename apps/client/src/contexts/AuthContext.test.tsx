import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../test/render";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

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
  let latestAuth: ReturnType<typeof useAuth> | null;

  beforeEach(() => {
    window.sessionStorage.clear();
    latestAuth = null;
  });

  function renderAuthHarness() {
    function Harness() {
      latestAuth = useAuth();
      return null;
    }

    return render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
  }

  it("stores the host token in session storage after login", async () => {
    const view = renderAuthHarness();

    await act(async () => {
      await expect(latestAuth?.loginHost("secret")).resolves.toBe(true);
    });

    expect(window.sessionStorage.getItem("quizco_host_token")).toBe("host-token");
    expect(latestAuth?.isHostAuthenticated).toBe(true);
    view.unmount();
  });

  it("keeps admin unauthenticated when login fails", async () => {
    const view = renderAuthHarness();

    await act(async () => {
      await expect(latestAuth?.loginAdmin("wrong")).resolves.toBe(false);
    });

    expect(window.sessionStorage.getItem("quizco_admin_token")).toBeNull();
    expect(latestAuth?.isAdminAuthenticated).toBe(false);
    view.unmount();
  });
});

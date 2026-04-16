import path from "path";
import { describe, expect, it } from "vitest";
import {
  resolveClientDistPath,
  shouldServeClientRoute,
} from "./staticClient";

describe("resolveClientDistPath", () => {
  it("prefers an explicit client dist directory", () => {
    expect(resolveClientDistPath("/repo", "/srv/client/dist")).toBe(
      path.resolve("/srv/client/dist"),
    );
  });

  it("falls back to the monorepo client dist directory", () => {
    expect(resolveClientDistPath("/repo")).toBe(
      path.resolve("/repo", "apps/client/dist"),
    );
  });
});

describe("shouldServeClientRoute", () => {
  it("allows application routes to fall through to the SPA", () => {
    expect(shouldServeClientRoute("/host")).toBe(true);
  });

  it("keeps API and socket routes on the backend handlers", () => {
    expect(shouldServeClientRoute("/api/competitions")).toBe(false);
    expect(shouldServeClientRoute("/socket.io/")).toBe(false);
  });
});

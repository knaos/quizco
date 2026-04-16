import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Competition, GameState } from "@quizco/shared";
import { flushEffects } from "../test/render";
import { renderHook } from "./testUtils";
import { useAudienceSession } from "./useAudienceSession";

const { emit, on, off } = vi.hoisted(() => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock("../socket", () => ({
  API_URL: "http://127.0.0.1:4000",
  socket: {
    emit,
    on,
    off,
  },
}));

const competitions: Competition[] = [
  {
    id: "comp-1",
    title: "Audience Quiz",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    host_pin: "1234",
  },
];

const state: GameState = {
  phase: "WAITING",
  currentQuestion: null,
  timeRemaining: 0,
  teams: [],
  revealStep: 0,
  timerPaused: false,
};

describe("useAudienceSession", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
    emit.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ json: async () => competitions }) as Response),
    );
    window.history.replaceState({}, "", "/audience");
  });

  it("persists competition selection and joins the room passively", async () => {
    const hook = renderHook(() => useAudienceSession(state));
    await flushEffects();

    await hook.act(async () => {
      hook.result.selectCompetition("comp-1");
      await Promise.resolve();
    });

    expect(window.localStorage.getItem("quizco_audience_competition_id")).toBe("comp-1");
    expect(window.location.search).toContain("competitionId=comp-1");
    expect(emit).toHaveBeenCalledWith("PUBLIC_JOIN_ROOM", { competitionId: "comp-1" });
    hook.unmount();
  });
});

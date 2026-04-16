import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Competition, GameState } from "@quizco/shared";
import { flushEffects } from "../test/render";
import { renderHook } from "./testUtils";
import { useHostDashboard } from "./useHostDashboard";

const listeners = new Map<string, ((...args: unknown[]) => void)[]>();

const { emit, on, off } = vi.hoisted(() => ({
  emit: vi.fn(),
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    const current = listeners.get(event) ?? [];
    listeners.set(event, [...current, handler]);
  }),
  off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    listeners.set(
      event,
      (listeners.get(event) ?? []).filter((candidate) => candidate !== handler),
    );
  }),
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
    title: "Host Quiz",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    host_pin: "4444",
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

describe("useHostDashboard", () => {
  beforeEach(() => {
    listeners.clear();
    emit.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.endsWith("/api/competitions")) {
          return { json: async () => competitions } as Response;
        }

        return {
          json: async () => ({
            rounds: [
              {
                id: "round-1",
                title: "Round 1",
                competitionId: "comp-1",
                orderIndex: 1,
                type: "STANDARD",
                createdAt: "2026-01-01T00:00:00.000Z",
                questions: [],
              },
            ],
          }),
        } as Response;
      }),
    );
    window.history.replaceState({}, "", "/host");
  });

  it("loads competitions, selects one, and rejoins after reconnect", async () => {
    const hook = renderHook(() => useHostDashboard(state));
    await flushEffects();

    expect(hook.result.competitions).toHaveLength(1);

    await hook.act(async () => {
      hook.result.selectCompetition(competitions[0]);
      await Promise.resolve();
    });

    expect(emit).toHaveBeenCalledWith("HOST_JOIN_ROOM", { competitionId: "comp-1" });
    expect(window.location.search).toContain("competitionId=comp-1");

    listeners.get("connect")?.forEach((handler) => handler());
    expect(emit).toHaveBeenLastCalledWith("HOST_JOIN_ROOM", { competitionId: "comp-1" });
    hook.unmount();
  });

  it("tracks question picker modal state locally", async () => {
    const hook = renderHook(() => useHostDashboard(state));
    await flushEffects();

    expect(hook.result.isQuestionPickerOpen).toBe(false);

    await hook.act(async () => {
      hook.result.openQuestionPicker();
    });

    expect(hook.result.isQuestionPickerOpen).toBe(true);

    await hook.act(async () => {
      hook.result.closeQuestionPicker();
    });

    expect(hook.result.isQuestionPickerOpen).toBe(false);
    hook.unmount();
  });
});

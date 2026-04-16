import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "@quizco/shared";
import { flushEffects } from "../test/render";
import { renderHook } from "./testUtils";
import { usePlayerSession } from "./usePlayerSession";

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

const baseState: GameState = {
  phase: "WAITING",
  currentQuestion: null,
  timeRemaining: 0,
  teams: [
    {
      id: "team-1",
      name: "Alpha",
      color: "#111111",
      score: 5,
      streak: 0,
      lastAnswerCorrect: null,
      lastAnswer: null,
      isExplicitlySubmitted: false,
      isConnected: true,
    },
    {
      id: "team-2",
      name: "Alpha",
      color: "#222222",
      score: 9,
      streak: 1,
      lastAnswerCorrect: true,
      lastAnswer: "answer",
      isExplicitlySubmitted: false,
      isConnected: true,
    },
  ],
  revealStep: 0,
  timerPaused: false,
};

describe("usePlayerSession", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => storage.clear(),
      },
    });

    emit.mockReset();
    on.mockReset();
    off.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ json: async () => [] }) as Response),
    );
  });

  it("uses the persisted teamId as the stable identity key after reconnect", async () => {
    window.localStorage.setItem("quizco_team_id", "team-2");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#222222");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-2", name: "Alpha", color: "#222222" },
        });
      }
    });

    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    expect(emit).toHaveBeenCalledWith(
      "RECONNECT_TEAM",
      { competitionId: "competition-1", teamId: "team-2" },
      expect.any(Function),
    );
    expect(hook.result.identity.teamId).toBe("team-2");
    expect(hook.result.currentTeam?.id).toBe("team-2");
    expect(hook.result.currentScore).toBe(9);
    hook.unmount();
  });

  it("does not enter reconnect mode without persisted session data", async () => {
    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    expect(emit).not.toHaveBeenCalledWith(
      "RECONNECT_TEAM",
      expect.anything(),
      expect.any(Function),
    );
    expect(hook.result.isReconnecting).toBe(false);
    hook.unmount();
  });

  it("hydrates the current question answer without relying on effect-driven resets", async () => {
    window.localStorage.setItem("quizco_team_id", "team-2");

    const questionState: GameState = {
      ...baseState,
      currentQuestion: {
        id: "question-1",
        roundId: "round-1",
        questionText: "Type one",
        type: "OPEN_WORD",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: { answer: "answer" },
      },
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();

    expect(hook.result.answer).toBe("answer");
    expect(hook.result.submissionStatus).toBe("idle");
    hook.unmount();
  });
});

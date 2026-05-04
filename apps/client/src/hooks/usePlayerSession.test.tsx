import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  milestones: [],
  revealedMilestones: [],
};

describe("usePlayerSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

  afterEach(() => {
    vi.useRealTimers();
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

  it("autosaves TRUE_FALSE draft answers during active question", async () => {
    window.localStorage.setItem("quizco_team_id", "team-2");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-2", name: "Alpha", color: "#222222" },
        });
      }
    });

    const questionState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-true-false",
        roundId: "round-1",
        questionText: "True or false?",
        type: "TRUE_FALSE",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: { isTrue: true },
      },
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();

    hook.act(() => {
      hook.result.setAnswer(true);
    });
    hook.act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(emit).toHaveBeenCalledWith(
      "SUBMIT_ANSWER",
      expect.objectContaining({
        competitionId: "competition-1",
        teamId: "team-2",
        questionId: "question-true-false",
        answer: true,
        isFinal: false,
      }),
    );

    hook.unmount();
  });

  it("autosaves MATCHING draft answers during active question", async () => {
    window.localStorage.setItem("quizco_team_id", "team-2");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-2", name: "Alpha", color: "#222222" },
        });
      }
    });

    const questionState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-matching",
        roundId: "round-1",
        questionText: "Match them",
        type: "MATCHING",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: {
          heroes: [{ id: "h1", label: "H1" }],
          stories: [{ id: "s1", label: "S1", correspondsTo: "h1" }],
        },
      },
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();

    hook.act(() => {
      hook.result.setAnswer({ h1: "s1" });
    });
    hook.act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(emit).toHaveBeenCalledWith(
      "SUBMIT_ANSWER",
      expect.objectContaining({
        competitionId: "competition-1",
        teamId: "team-2",
        questionId: "question-matching",
        answer: { h1: "s1" },
        isFinal: false,
      }),
    );

    hook.unmount();
  });

  it("autosaves CHRONOLOGY draft answers during active question", async () => {
    window.localStorage.setItem("quizco_team_id", "team-2");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-2", name: "Alpha", color: "#222222" },
        });
      }
    });

    const questionState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-chronology",
        roundId: "round-1",
        questionText: "Order these",
        type: "CHRONOLOGY",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: {
          items: [
            { id: "event-1", text: "First", order: 1 },
            { id: "event-2", text: "Second", order: 2 },
          ],
        },
      },
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();

    hook.act(() => {
      hook.result.setAnswer({ slotIds: ["event-1", null], poolIds: ["event-2"] });
    });
    hook.act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(emit).toHaveBeenCalledWith(
      "SUBMIT_ANSWER",
      expect.objectContaining({
        competitionId: "competition-1",
        teamId: "team-2",
        questionId: "question-chronology",
        answer: { slotIds: ["event-1", null], poolIds: ["event-2"] },
        isFinal: false,
      }),
    );

    hook.unmount();
  });

  it("autosaves CORRECT_THE_ERROR draft answers during active question", async () => {
    window.localStorage.setItem("quizco_team_id", "team-2");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-2", name: "Alpha", color: "#222222" },
        });
      }
    });

    const questionState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-correct-error",
        roundId: "round-1",
        questionText: "Fix the word",
        type: "CORRECT_THE_ERROR",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: {
          text: "Teh sky is blue",
          errorWordIndex: 0,
          correctReplacement: "The",
        },
      },
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();

    hook.act(() => {
      hook.result.setAnswer({ selectedWordIndex: 0, correction: "The" });
    });
    hook.act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(emit).toHaveBeenCalledWith(
      "SUBMIT_ANSWER",
      expect.objectContaining({
        competitionId: "competition-1",
        teamId: "team-2",
        questionId: "question-correct-error",
        answer: { selectedWordIndex: 0, correction: "The" },
        isFinal: false,
      }),
    );

    hook.unmount();
  });
});

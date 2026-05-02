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

  it("does not reconnect after a fresh join writes localStorage", async () => {
    emit.mockImplementation((event, _payload, callback) => {
      if (event === "JOIN_ROOM") {
        callback?.({
          success: true,
          team: { id: "team-new", name: "Fresh Team", color: "#123456" },
        });
      }
    });

    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    hook.act(() => {
      hook.result.selectCompetition("competition-1");
      hook.result.setTeamName("Fresh Team");
      hook.result.setColor("#123456");
    });
    await flushEffects();

    hook.act(() => {
      hook.result.joinTeam();
    });
    await flushEffects();

    expect(emit).toHaveBeenCalledWith(
      "JOIN_ROOM",
      {
        competitionId: "competition-1",
        teamName: "Fresh Team",
        color: "#123456",
      },
      expect.any(Function),
    );
    expect(emit).not.toHaveBeenCalledWith(
      "RECONNECT_TEAM",
      expect.anything(),
      expect.any(Function),
    );
    expect(hook.result.joined).toBe(true);
    hook.unmount();
  });

  it("keeps untouched true/false answers as explicit null draft state", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");

    const questionState: GameState = {
      ...baseState,
      currentQuestion: {
        id: "question-true-false-1",
        roundId: "round-1",
        questionText: "True or false",
        type: "TRUE_FALSE",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: { isTrue: true },
      },
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();

    expect(hook.result.answer).toBeNull();
    hook.unmount();
  });

  it("does not autosave untouched chronology defaults", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const questionState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-chronology-empty",
        roundId: "round-1",
        questionText: "Put these in order",
        type: "CHRONOLOGY",
        points: 10,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: {
          items: [
            { id: "c1", text: "First", order: 0 },
            { id: "c2", text: "Second", order: 1 },
          ],
        },
      },
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();
    await vi.advanceTimersByTimeAsync(500);

    expect(emit.mock.calls.filter(([event]) => event === "SUBMIT_ANSWER")).toHaveLength(0);
    hook.unmount();
  });

  it("does not autosave untouched crossword grids", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const questionState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-crossword-empty",
        roundId: "round-1",
        questionText: "Fill the grid",
        type: "CROSSWORD",
        points: 10,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: {
          grid: [["A"]],
          clues: {
            across: [{ clue: "Letter", answer: "A", direction: "across", x: 0, y: 0, number: 1 }],
            down: [],
          },
        },
      },
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();
    await vi.advanceTimersByTimeAsync(500);

    expect(emit.mock.calls.filter(([event]) => event === "SUBMIT_ANSWER")).toHaveLength(0);
    hook.unmount();
  });

  it("does not autosave untouched correct-the-error defaults", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const questionState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-correct-error-empty",
        roundId: "round-1",
        questionText: "Correct the sentence",
        type: "CORRECT_THE_ERROR",
        points: 10,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: {
          text: "The sky is green",
          words: [
            { wordIndex: 3, text: "green", alternatives: ["blue", "green"] },
          ],
          errorWordIndex: 3,
          correctReplacement: "blue",
        },
      },
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();
    await vi.advanceTimersByTimeAsync(500);

    expect(emit.mock.calls.filter(([event]) => event === "SUBMIT_ANSWER")).toHaveLength(0);
    hook.unmount();
  });

  it("deduplicates repeated chronology partial autosaves when the answer has not changed", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const questionState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-chronology-1",
        roundId: "round-1",
        questionText: "Put these in order",
        type: "CHRONOLOGY",
        points: 10,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: {
          items: [
            { id: "c1", text: "First", order: 0 },
            { id: "c2", text: "Second", order: 1 },
          ],
        },
      },
      teams: baseState.teams.map((team) =>
        team.id === "team-1"
          ? {
            ...team,
            lastAnswer: {
              slotIds: ["c1", null],
              poolIds: ["c2"],
            },
          }
          : team,
      ),
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();

    await vi.advanceTimersByTimeAsync(500);

    const submitCallsAfterFirstTick = emit.mock.calls.filter(
      ([event]) => event === "SUBMIT_ANSWER",
    );
    expect(submitCallsAfterFirstTick).toHaveLength(1);
    expect(submitCallsAfterFirstTick[0]?.[1]).toMatchObject({
      competitionId: "competition-1",
      teamId: "team-1",
      questionId: "question-chronology-1",
      answer: {
        slotIds: ["c1", null],
        poolIds: ["c2"],
      },
      isFinal: false,
    });

    hook.rerender();
    await flushEffects();
    await vi.advanceTimersByTimeAsync(500);

    const submitCallsAfterSecondTick = emit.mock.calls.filter(
      ([event]) => event === "SUBMIT_ANSWER",
    );
    expect(submitCallsAfterSecondTick).toHaveLength(1);

    hook.unmount();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "@quizco/shared";
import { flushEffects } from "../test/render";
import { socket } from "../socket";
import { renderHook } from "./testUtils";
import { usePlayerSession } from "./usePlayerSession";

const { emit, on, off } = vi.hoisted(() => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

type SocketHandler = (...args: unknown[]) => void;

vi.mock("../socket", () => ({
  API_URL: "http://127.0.0.1:4000",
  socket: {
    emit,
    on,
    off,
    connected: true,
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
    socket.connected = true;
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
    await hook.act(async () => {
      await flushEffects();
    });

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
    await hook.act(async () => {
      await flushEffects();
    });

    expect(emit).not.toHaveBeenCalledWith(
      "RECONNECT_TEAM",
      expect.anything(),
      expect.any(Function),
    );
    expect(hook.result.isReconnecting).toBe(false);
    hook.unmount();
  });

  it("clears stale identity when reconnect is rejected", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({ success: false });
      }
    });

    const hook = renderHook(() => usePlayerSession(baseState));
    await hook.act(async () => {
      await flushEffects();
    });

    expect(hook.result.joined).toBe(false);
    expect(hook.result.identity.teamId).toBeNull();
    expect(hook.result.identity.teamName).toBe("");
    expect(hook.result.identity.color).toBe("#3B82F6");
    expect(hook.result.isReconnecting).toBe(false);
    expect(window.localStorage.getItem("quizco_team_id")).toBeNull();
    expect(window.localStorage.getItem("quizco_selected_competition_id")).toBeNull();
    hook.unmount();
  });

  it("adopts the joined team from authoritative state when the join callback is missing", async () => {
    let currentState: GameState = {
      ...baseState,
      teams: [],
    };

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "JOIN_ROOM") {
        callback?.(null);
      }
    });

    const hook = renderHook(() => usePlayerSession(currentState));
    await hook.act(async () => {
      await flushEffects();
    });

    hook.act(() => {
      hook.result.selectCompetition("competition-1");
      hook.result.setTeamName("Alpha");
      hook.result.setColor("#111111");
    });
    await hook.act(async () => {
      await flushEffects();
    });

    hook.act(() => {
      hook.result.joinTeam();
    });
    await hook.act(async () => {
      await flushEffects();
    });

    expect(hook.result.joined).toBe(false);
    currentState = {
      ...baseState,
      teams: [baseState.teams[0]],
    };
    hook.rerenderHook();
    await hook.act(async () => {
      await flushEffects();
    });

    expect(hook.result.joined).toBe(true);
    expect(hook.result.identity.teamId).toBe("team-1");
    expect(hook.result.currentTeam?.id).toBe("team-1");
    hook.unmount();
  });

  it("keeps the existing session when reconnect callback is missing", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    let reconnectCalls = 0;
    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        reconnectCalls += 1;
        if (reconnectCalls === 1) {
          callback?.({
            success: true,
            team: { id: "team-1", name: "Alpha", color: "#111111" },
          });
          return;
        }
        callback?.(null);
      }
    });

    const hook = renderHook(() => usePlayerSession(baseState));
    await hook.act(async () => {
      await flushEffects();
    });

    expect(hook.result.joined).toBe(true);

    const connectHandler = on.mock.calls.find(([eventName]) => eventName === "connect")?.[1] as
      | SocketHandler
      | undefined;
    expect(connectHandler).toBeDefined();

    await hook.act(async () => {
      connectHandler?.();
      await flushEffects();
    });

    expect(hook.result.joined).toBe(true);
    expect(hook.result.identity.teamId).toBe("team-1");
    expect(window.localStorage.getItem("quizco_team_id")).toBe("team-1");
    hook.unmount();
  });

  it("does not trigger reconnect after a successful join persists identity", async () => {
    emit.mockImplementation((event, _payload, callback) => {
      if (event === "JOIN_ROOM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const hook = renderHook(() => usePlayerSession(baseState));
    await hook.act(async () => {
      await flushEffects();
    });

    hook.act(() => {
      hook.result.selectCompetition("competition-1");
      hook.result.setTeamName("Alpha");
      hook.result.setColor("#111111");
    });
    await hook.act(async () => {
      await flushEffects();
    });

    hook.act(() => {
      hook.result.joinTeam();
    });
    await hook.act(async () => {
      await flushEffects();
    });

    expect(
      emit.mock.calls.filter(([eventName]) => eventName === "RECONNECT_TEAM"),
    ).toHaveLength(0);
    expect(hook.result.joined).toBe(true);
    expect(hook.result.identity.teamId).toBe("team-1");
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
    await hook.act(async () => {
      await flushEffects();
    });

    expect(hook.result.answer).toBe("answer");
    expect(hook.result.submissionStatus).toBe("idle");
    hook.unmount();
  });

  it("does not duplicate a pending final submission on raw socket connect before reconnect completes", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    const activeState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-1",
        roundId: "round-1",
        questionText: "Type one",
        type: "OPEN_WORD",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: { answer: "Faith" },
      },
    };

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const hook = renderHook(() => usePlayerSession(activeState));
    await hook.act(async () => {
      await flushEffects();
    });

    hook.act(() => {
      hook.result.submitAnswer("Faith", true);
    });
    await hook.act(async () => {
      await flushEffects();
    });

    const pendingSubmission = window.localStorage.getItem("quizco_pending_final_submission");
    expect(pendingSubmission).not.toBeNull();
    expect(emit).toHaveBeenCalledWith(
      "SUBMIT_ANSWER",
      expect.objectContaining({
        competitionId: "competition-1",
        teamId: "team-1",
        questionId: "question-1",
        answer: "Faith",
        isFinal: true,
      }),
      expect.any(Function),
    );

    const connectHandler = on.mock.calls.find(([eventName]) => eventName === "connect")?.[1] as
      | SocketHandler
      | undefined;
    expect(connectHandler).toBeDefined();

    await hook.act(async () => {
      connectHandler?.();
      await flushEffects();
    });

    const submitAnswerCalls = emit.mock.calls.filter(([eventName]) => eventName === "SUBMIT_ANSWER");
    expect(submitAnswerCalls).toHaveLength(1);

    hook.unmount();
  });

  it("defers an offline final submission until reconnect", async () => {
    socket.connected = false;

    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");

    const activeState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-1",
        roundId: "round-1",
        questionText: "Type one",
        type: "OPEN_WORD",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: { answer: "Faith" },
      },
    };

    const hook = renderHook(() => usePlayerSession(activeState));
    await hook.act(async () => {
      await flushEffects();
    });

    hook.act(() => {
      hook.result.submitAnswer("Faith", true);
    });
    await hook.act(async () => {
      await flushEffects();
    });

    expect(
      emit.mock.calls.filter(([eventName]) => eventName === "SUBMIT_ANSWER"),
    ).toHaveLength(0);
    expect(window.localStorage.getItem("quizco_pending_final_submission")).not.toBeNull();

    socket.connected = true;
    hook.unmount();
  });

  it("replays a pending final submission when the browser comes back online without a socket reconnect", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");
    window.localStorage.setItem(
      "quizco_pending_final_submission",
      JSON.stringify({
        competitionId: "competition-1",
        teamId: "team-1",
        questionId: "question-1",
        answer: "Faith",
      }),
    );

    const activeState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-1",
        roundId: "round-1",
        questionText: "Type one",
        type: "OPEN_WORD",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: { answer: "Faith" },
      },
    };

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const hook = renderHook(() => usePlayerSession(activeState));
    await hook.act(async () => {
      await flushEffects();
    });

    emit.mockClear();

    await hook.act(async () => {
      window.dispatchEvent(new Event("online"));
      await flushEffects();
    });

    expect(emit).toHaveBeenCalledWith(
      "SUBMIT_ANSWER",
      expect.objectContaining({
        competitionId: "competition-1",
        teamId: "team-1",
        questionId: "question-1",
        answer: "Faith",
        isFinal: true,
      }),
      expect.any(Function),
    );

    hook.unmount();
  });

  it("replays a pending final submission after the initial reconnect restores the session", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");
    window.localStorage.setItem(
      "quizco_pending_final_submission",
      JSON.stringify({
        competitionId: "competition-1",
        teamId: "team-1",
        questionId: "question-1",
        answer: "Faith",
      }),
    );

    const activeState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-1",
        roundId: "round-1",
        questionText: "Type one",
        type: "OPEN_WORD",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: { answer: "Faith" },
      },
    };

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const hook = renderHook(() => usePlayerSession(activeState));
    await hook.act(async () => {
      await flushEffects();
    });

    expect(emit).toHaveBeenCalledWith(
      "SUBMIT_ANSWER",
      expect.objectContaining({
        competitionId: "competition-1",
        teamId: "team-1",
        questionId: "question-1",
        answer: "Faith",
        isFinal: true,
      }),
      expect.any(Function),
    );

    hook.unmount();
  });

  it("clears the pending final submission after authoritative state confirms it", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "competition-1");
    window.localStorage.setItem(
      "quizco_pending_final_submission",
      JSON.stringify({
        competitionId: "competition-1",
        teamId: "team-1",
        questionId: "question-1",
        answer: "Faith",
      }),
    );

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const submittedState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-1",
        roundId: "round-1",
        questionText: "Type one",
        type: "OPEN_WORD",
        points: 1,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: { answer: "Faith" },
      },
      teams: [
        {
          ...baseState.teams[0],
          lastAnswer: "Faith",
          isExplicitlySubmitted: true,
        },
        baseState.teams[1],
      ],
    };

    const hook = renderHook(() => usePlayerSession(submittedState));
    await hook.act(async () => {
      await flushEffects();
    });

    expect(window.localStorage.getItem("quizco_pending_final_submission")).toBeNull();
    expect(
      emit.mock.calls.filter(([eventName]) => eventName === "SUBMIT_ANSWER"),
    ).toHaveLength(0);

    hook.unmount();
  });

  it("clears the pending final submission when leaving the session", async () => {
    window.localStorage.setItem(
      "quizco_pending_final_submission",
      JSON.stringify({
        competitionId: "competition-1",
        teamId: "team-1",
        questionId: "question-1",
        answer: "Faith",
      }),
    );

    const hook = renderHook(() => usePlayerSession(baseState));
    await hook.act(async () => {
      await flushEffects();
    });

    hook.act(() => {
      hook.result.leaveSession();
    });

    expect(window.localStorage.getItem("quizco_pending_final_submission")).toBeNull();
    expect(hook.result.identity.teamId).toBeNull();
    expect(hook.result.selectedCompId).toBeNull();
    hook.unmount();
  });
});

import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "@quizco/shared";
import { flushEffects } from "../test/render";
import { renderHook } from "./testUtils";
import { usePlayerSession } from "./usePlayerSession";
import { draftAnswerReducer, teamReducer } from "./usePlayerSession";

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

  it("updates teamName via setTeamName callback", async () => {
    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    await act(async () => {
      hook.result.setTeamName("New Team Name");
    });
    expect(hook.result.identity.teamName).toBe("New Team Name");
    hook.unmount();
  });

  it("updates color via setColor callback", async () => {
    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    await act(async () => {
      hook.result.setColor("#FF0000");
    });
    expect(hook.result.identity.color).toBe("#FF0000");
    hook.unmount();
  });

  it("clears session via leaveSession callback", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "comp-1");

    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    await act(async () => {
      hook.result.leaveSession();
    });

    expect(hook.result.identity.teamId).toBeNull();
    expect(hook.result.identity.teamName).toBe("");
    expect(hook.result.joined).toBe(false);
    expect(hook.result.selectedCompId).toBeNull();
    hook.unmount();
  });

  it("calls getCorrectAnswer and returns correct answer string", async () => {
    const question: GameState["currentQuestion"] = {
      id: "q1",
      roundId: "r1",
      questionText: "What is 2+2?",
      type: "MULTIPLE_CHOICE",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        options: ["3", "4", "5", "6"],
        correctIndices: [1],
      },
    };

    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    const result = hook.result.getCorrectAnswer(question, (key: string) => key);
    expect(result).toBeDefined();
    hook.unmount();
  });

  it("emits REQUEST_JOKER via requestJoker callback", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "comp-1");

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
        id: "question-1",
        roundId: "round-1",
        questionText: "Test",
        type: "CROSSWORD",
        points: 10,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: { grid: [] },
      },
    };

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();

    hook.result.requestJoker();

    expect(emit).toHaveBeenLastCalledWith(
      "REQUEST_JOKER",
      {
        competitionId: "comp-1",
        teamId: "team-1",
        questionId: "question-1",
      },
    );
    hook.unmount();
  });

  it("updates answer via setAnswer callback", async () => {
    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    await act(async () => {
      hook.result.setAnswer("new answer");
    });
    expect(hook.result.answer).toBe("new answer");
    hook.unmount();
  });

  it("updates selectedIndices via toggleIndex callback", async () => {
    const multipleChoiceState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-1",
        roundId: "round-1",
        questionText: "Pick one",
        type: "MULTIPLE_CHOICE",
        points: 10,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: {
          options: ["A", "B", "C", "D"],
          correctIndices: [0],
        },
      },
    };

    emit.mockImplementation((event, payload, callback) => {
      if (event === "JOIN_ROOM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const hook = renderHook(() => usePlayerSession(multipleChoiceState));
    await flushEffects();

    await act(async () => {
      hook.result.toggleIndex(1);
    });

    expect(hook.result.selectedIndices).toContain(1);
    hook.unmount();
  });

  it("joins team via joinTeam callback", async () => {
    window.localStorage.setItem("quizco_selected_competition_id", "comp-1");

    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    await act(async () => {
      hook.result.setTeamName("Test Team");
    });
    await act(async () => {
      hook.result.setColor("#FF0000");
    });
    hook.result.joinTeam();

    expect(emit).toHaveBeenCalledWith(
      "JOIN_ROOM",
      { competitionId: "comp-1", teamName: "Test Team", color: "#FF0000" },
      expect.any(Function),
    );
    hook.unmount();
  });

  it("selects competition via selectCompetition callback", async () => {
    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    await act(async () => {
      hook.result.selectCompetition("new-comp-id");
    });

    expect(hook.result.selectedCompId).toBe("new-comp-id");
    hook.unmount();
  });

  it("clears selected competition via clearSelectedCompetition callback", async () => {
    window.localStorage.setItem("quizco_selected_competition_id", "comp-1");

    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    await act(async () => {
      hook.result.clearSelectedCompetition();
    });

    expect(hook.result.selectedCompId).toBeNull();
    hook.unmount();
  });

  it("submits answer via submitAnswer callback", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "comp-1");

    const questionState: GameState = {
      ...baseState,
      phase: "QUESTION_ACTIVE",
      currentQuestion: {
        id: "question-1",
        roundId: "round-1",
        questionText: "Answer this",
        type: "OPEN_WORD",
        points: 10,
        timeLimitSeconds: 30,
        grading: "AUTO",
        content: { answer: "correct" },
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

    const hook = renderHook(() => usePlayerSession(questionState));
    await flushEffects();

    hook.result.submitAnswer("my answer", true);

    expect(emit).toHaveBeenCalledWith(
      "SUBMIT_ANSWER",
      {
        competitionId: "comp-1",
        teamId: "team-1",
        questionId: "question-1",
        answer: "my answer",
        isFinal: true,
      },
      expect.any(Function),
    );
    hook.unmount();
  });

  it("returns getGradingStatus correctly", async () => {
    window.localStorage.setItem("quizco_team_id", "team-1");
    window.localStorage.setItem("quizco_team_name", "Alpha");
    window.localStorage.setItem("quizco_team_color", "#111111");
    window.localStorage.setItem("quizco_selected_competition_id", "comp-1");

    emit.mockImplementation((event, _payload, callback) => {
      if (event === "RECONNECT_TEAM") {
        callback?.({
          success: true,
          team: { id: "team-1", name: "Alpha", color: "#111111" },
        });
      }
    });

    const hook = renderHook(() => usePlayerSession(baseState));
    await flushEffects();

    const gradingStatus = hook.result.getGradingStatus();
    expect(gradingStatus).toBeUndefined();

    const stateWithCorrectAnswer: GameState = {
      ...baseState,
      teams: [
        {
          ...baseState.teams[0],
          lastAnswerCorrect: true,
        },
      ],
    };

    const hook2 = renderHook(() => usePlayerSession(stateWithCorrectAnswer));
    await flushEffects();

    expect(hook2.result.getGradingStatus()).toBe(true);
    hook.unmount();
    hook2.unmount();
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

describe("draftAnswerReducer", () => {
  const initialState = {
    questionId: null,
    answer: "",
    selectedIndices: [],
    submissionStatus: "idle" as const,
  };

  it("handles SET_ANSWER", () => {
    const result = draftAnswerReducer(initialState, {
      type: "SET_ANSWER",
      payload: "test-answer",
      questionId: "q1",
    });
    expect(result.answer).toBe("test-answer");
    expect(result.questionId).toBe("q1");
    expect(result.submissionStatus).toBe("idle");
  });

  it("handles SET_INDICES", () => {
    const result = draftAnswerReducer(initialState, {
      type: "SET_INDICES",
      payload: [0, 1, 2],
      questionId: "q1",
    });
    expect(result.selectedIndices).toEqual([0, 1, 2]);
    expect(result.answer).toEqual([0, 1, 2]);
  });

  it("handles SET_SUBMISSION_STATUS", () => {
    const result = draftAnswerReducer(initialState, {
      type: "SET_SUBMISSION_STATUS",
      payload: "success",
    });
    expect(result.submissionStatus).toBe("success");
  });

  it("handles RESET", () => {
    const modifiedState = {
      questionId: "q1",
      answer: "test",
      selectedIndices: [1, 2],
      submissionStatus: "success" as const,
    };
    const result = draftAnswerReducer(modifiedState, { type: "RESET" });
    expect(result).toEqual(initialState);
  });

  it("handles HYDRATE_FROM_SERVER", () => {
    const result = draftAnswerReducer(initialState, {
      type: "HYDRATE_FROM_SERVER",
      payload: {
        questionId: "q2",
        answer: "server-answer",
        selectedIndices: [0],
      },
    });
    expect(result.questionId).toBe("q2");
    expect(result.answer).toBe("server-answer");
    expect(result.selectedIndices).toEqual([0]);
    expect(result.submissionStatus).toBe("idle");
  });

  it("returns same state for unknown action", () => {
    const result = draftAnswerReducer(initialState, {
      type: "UNKNOWN_ACTION" as never,
    });
    expect(result).toBe(initialState);
  });
});

describe("teamReducer", () => {
  const initialState = {
    teamId: null,
    teamName: "",
    color: "#3B82F6",
    joined: false,
  };

  it("handles SET_IDENTITY", () => {
    const result = teamReducer(initialState, {
      type: "SET_IDENTITY",
      payload: { teamId: "team-1", teamName: "Team A", color: "#FF0000" },
    });
    expect(result.teamId).toBe("team-1");
    expect(result.teamName).toBe("Team A");
    expect(result.color).toBe("#FF0000");
  });

  it("handles JOIN", () => {
    const result = teamReducer(initialState, { type: "JOIN" });
    expect(result.joined).toBe(true);
  });

  it("handles LEAVE", () => {
    const nonInitialState = {
      teamId: "team-1",
      teamName: "Team A",
      color: "#FF0000",
      joined: true,
    };
    const result = teamReducer(nonInitialState, { type: "LEAVE" });
    expect(result.teamId).toBeNull();
    expect(result.teamName).toBe("");
    expect(result.color).toBe("#3B82F6");
    expect(result.joined).toBe(false);
  });

  it("handles SET_TEAM_NAME", () => {
    const result = teamReducer(initialState, {
      type: "SET_TEAM_NAME",
      payload: "New Name",
    });
    expect(result.teamName).toBe("New Name");
  });

  it("handles SET_COLOR", () => {
    const result = teamReducer(initialState, {
      type: "SET_COLOR",
      payload: "#00FF00",
    });
    expect(result.color).toBe("#00FF00");
  });

  it("returns same state for unknown action", () => {
    const result = teamReducer(initialState, {
      type: "UNKNOWN_ACTION" as never,
    });
    expect(result).toBe(initialState);
  });
});

import { describe, expect, it, vi } from "vitest";
import type { GameState } from "@quizco/shared";
import { GameContext } from "../contexts/game-context";
import { render } from "../test/render";
import { PlayerView } from "./PlayerView";

vi.mock("../hooks/usePlayerSession", () => ({
  usePlayerSession: vi.fn(() => ({
    competitions: [],
    selectedCompId: "comp-1",
    joined: true,
    isReconnecting: false,
    identity: { teamId: "team-1", teamName: "Alpha", color: "#0000ff" },
    answer: "",
    selectedIndices: [],
    submissionStatus: "idle",
    currentTeam: { id: "team-1", name: "Alpha", color: "#0000ff", score: 0, streak: 0, lastAnswerCorrect: null, lastAnswer: null, isExplicitlySubmitted: false, isConnected: true },
    hasSubmitted: false,
    correctTheErrorPartialScore: 0,
    loginError: null,
    currentScore: 0,
    setTeamName: vi.fn(),
    setColor: vi.fn(),
    setAnswer: vi.fn(),
    selectCompetition: vi.fn(),
    clearSelectedCompetition: vi.fn(),
    joinTeam: vi.fn(),
    leaveSession: vi.fn(),
    toggleIndex: vi.fn(),
    submitAnswer: vi.fn(),
    getCorrectAnswer: vi.fn(() => ""),
    getGradingStatus: vi.fn(() => undefined),
    requestJoker: vi.fn(),
  })),
}));

const previewState: GameState = {
  phase: "QUESTION_PREVIEW",
  currentQuestion: {
    id: "question-1",
    roundId: "round-1",
    questionText: "Preview question",
    type: "OPEN_WORD",
    points: 10,
    timeLimitSeconds: 30,
    grading: "AUTO",
    content: { answer: "Patience" },
  },
  timeRemaining: 15,
  teams: [],
  revealStep: 0,
  timerPaused: false,
};

describe("PlayerView", () => {
  it("renders question preview only once in QUESTION_PREVIEW phase", () => {
    const view = render(
      <GameContext.Provider value={{ state: previewState, dispatch: vi.fn() }}>
        <PlayerView />
      </GameContext.Provider>,
    );

    expect(view.container.textContent?.match(/Preview question/g)?.length).toBe(1);
    view.unmount();
  });
});

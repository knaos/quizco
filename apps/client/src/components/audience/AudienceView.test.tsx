import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Competition, GameState } from "@quizco/shared";
import { GameContext } from "../../contexts/game-context";
import { render, flushEffects } from "../../test/render";
import { AudienceView } from "./AudienceView";

const { emit } = vi.hoisted(() => ({
  emit: vi.fn(),
}));

vi.mock("../../socket", () => ({
  API_URL: "http://127.0.0.1:4000",
  socket: {
    emit,
    on: vi.fn(),
    off: vi.fn(),
  },
}));

const waitingState: GameState = {
  phase: "WAITING",
  currentQuestion: null,
  timeRemaining: 0,
  teams: [],
  revealStep: 0,
  timerPaused: false,
};

const revealState: GameState = {
  phase: "REVEAL_ANSWER",
  currentQuestion: {
    id: "question-1",
    roundId: "round-1",
    questionText: "Which answer is correct?",
    type: "MULTIPLE_CHOICE",
    points: 10,
    timeLimitSeconds: 30,
    grading: "AUTO",
    content: {
      options: ["Alpha", "Beta"],
      correctIndices: [1],
    },
  },
  timeRemaining: 0,
  teams: [],
  revealStep: 0,
  timerPaused: false,
};

const competitions: Competition[] = [
  {
    id: "comp-1",
    title: "Audience Quiz",
    status: "ACTIVE",
    createdAt: "2026-03-25T10:00:00.000Z",
    host_pin: "9999",
  },
];

function renderAudience(state: GameState = waitingState) {
  return render(
    <GameContext.Provider value={{ state, dispatch: vi.fn() }}>
      <AudienceView />
    </GameContext.Provider>,
  );
}

describe("AudienceView", () => {
  beforeEach(() => {
    emit.mockClear();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/audience");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.endsWith("/api/competitions")) {
          return {
            json: async () => competitions,
          } as Response;
        }

        return {
          json: async () => [],
        } as Response;
      }),
    );
  });

  it("renders the competition selector when no competition is chosen", async () => {
    const view = renderAudience();
    await flushEffects();

    expect(
      view.container.querySelector('[data-testid="competition-selector"]'),
    ).not.toBeNull();
    expect(view.container.textContent).toContain("Audience Quiz");
    view.unmount();
  });

  it("honors the competition query param and joins passively", async () => {
    window.history.replaceState({}, "", "/audience?competitionId=comp-1");

    const view = renderAudience();
    await flushEffects();

    expect(
      view.container.querySelector('[data-testid="audience-phase"]'),
    ).not.toBeNull();
    expect(emit).toHaveBeenCalledWith("HOST_JOIN_ROOM", {
      competitionId: "comp-1",
    });
    view.unmount();
  });

  it("shows reveal stats after the correct answer is revealed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.endsWith("/api/competitions")) {
          return {
            json: async () => competitions,
          } as Response;
        }

        return {
          json: async () => [
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: true },
            { isCorrect: false },
          ],
        } as Response;
      }),
    );

    window.history.replaceState({}, "", "/audience?competitionId=comp-1");

    const view = renderAudience(revealState);
    await flushEffects();
    await flushEffects();

    expect(view.container.textContent).toContain("Beta");
    expect(view.container.textContent).toContain("4/5 teams correct (80%)");
    expect(
      view.container.querySelector('[data-testid="audience-answer-stats"]'),
    ).not.toBeNull();

    view.unmount();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Competition, GameState } from "@quizco/shared";
import { GameContext } from "../../contexts/game-context";
import { click, render, flushEffects } from "../../test/render";
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
  milestones: [],
  revealedMilestones: [],
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
    index: 0,
    content: {
      options: ["Alpha", "Beta"],
      correctIndices: [1],
    },
  },
  timeRemaining: 0,
  teams: [],
  revealStep: 0,
  timerPaused: false,
  milestones: [],
  revealedMilestones: [],
};

const crosswordActiveState: GameState = {
  phase: "QUESTION_ACTIVE",
  currentQuestion: {
    id: "question-2",
    roundId: "round-1",
    questionText: "Audience crossword question",
    type: "CROSSWORD",
    points: 10,
    timeLimitSeconds: 30,
    grading: "AUTO",
    index: 0,
    content: {
      grid: [["A", "B"], ["", "C"]],
      clues: {
        across: [
          {
            number: 1,
            x: 0,
            y: 0,
            direction: "across",
            clue: "Audience across clue",
            answer: "AB",
          },
        ],
        down: [
          {
            number: 2,
            x: 1,
            y: 0,
            direction: "down",
            clue: "Audience down clue",
            answer: "BC",
          },
        ],
      },
    },
  },
  timeRemaining: 18,
  teams: [],
  revealStep: 0,
  timerPaused: false,
  milestones: [],
  revealedMilestones: [],
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
        clear: () => {
          storage.clear();
        },
      },
    });

    emit.mockClear();
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

  it("honors the competition query param and joins publicly", async () => {
    window.history.replaceState({}, "", "/audience?competitionId=comp-1");

    const view = renderAudience();
    await flushEffects();

    expect(
      view.container.querySelector('[data-testid="audience-phase"]'),
    ).not.toBeNull();
    expect(emit).toHaveBeenCalledWith("PUBLIC_JOIN_ROOM", {
      competitionId: "comp-1",
    });
    view.unmount();
  });

  it("persists a selected competition to local storage and the URL", async () => {
    const view = renderAudience();
    await flushEffects();

    const selector = view.container.querySelector(
      '[data-testid="competition-option-comp-1"]',
    );

    expect(selector).not.toBeNull();
    click(selector as HTMLElement);
    await flushEffects();

    expect(window.localStorage.getItem("quizco_audience_competition_id")).toBe(
      "comp-1",
    );
    expect(window.location.search).toContain("competitionId=comp-1");
    expect(emit).toHaveBeenCalledWith("PUBLIC_JOIN_ROOM", {
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

    view.unmount();
  });

  it("renders crossword questions passively for the audience during active play", async () => {
    window.history.replaceState({}, "", "/audience?competitionId=comp-1");

    const view = renderAudience(crosswordActiveState);
    await flushEffects();

    expect(view.container.textContent).toContain("Audience crossword question");
    expect(view.container.textContent).toContain("Audience across clue");
    expect(view.container.textContent).toContain("Audience down clue");
    expect(
      view.container.querySelector('[data-testid="audience-crossword"]'),
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-testid="audience-crossword-cell-0-0"]'),
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-testid="audience-crossword-across-0"]'),
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-testid="audience-crossword-down-0"]'),
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-testid="crossword-submit"]'),
    ).toBeNull();
    expect(
      view.container.querySelector('[data-testid="crossword-cell-0-0"]'),
    ).toBeNull();

    view.unmount();
  });
});

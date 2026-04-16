import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Competition, GameState } from "@quizco/shared";
import { useGame } from "../contexts/useGame";
import { useAuth } from "../contexts/useAuth";
import { click, render } from "../test/render";
import { HostDashboard } from "./HostDashboard";

const mockUseHostDashboard = vi.fn();

vi.mock("../contexts/useGame", () => ({
  useGame: vi.fn(),
}));

vi.mock("../contexts/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useHostDashboard", () => ({
  useHostDashboard: (...args: unknown[]) => mockUseHostDashboard(...args),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "host.presenter_submissions") {
        return `${options?.count} / ${options?.total} submitted`;
      }
      if (key === "host.presenter_phase") {
        return `Phase: ${options?.phase}`;
      }
      if (key === "host.presenter_points") {
        return `${options?.count} pts`;
      }
      if (key === "host.presenter_time_limit") {
        return `${options?.count}s`;
      }
      if (key === "host.option_label") {
        return `Option ${options?.label}`;
      }
      if (key === "host.blank_label") {
        return `Blank ${options?.number}`;
      }
      if (key === "host.round_title") {
        return `Round: ${options?.title}`;
      }
      if (key === "host.questions_count") {
        return `${options?.count} Questions`;
      }
      if (key === "host.actions.reveal_option") {
        return `Reveal Option ${options?.label}`;
      }
      return key;
    },
  }),
}));

vi.mock("./LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

const selectedComp: Competition = {
  id: "comp-1",
  title: "Host Quiz",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  host_pin: "1234",
};

const state: GameState = {
  phase: "QUESTION_PREVIEW",
  currentQuestion: {
    id: "question-1",
    roundId: "round-1",
    questionText: "Who built the ark?",
    type: "MULTIPLE_CHOICE",
    points: 10,
    timeLimitSeconds: 30,
    grading: "AUTO",
    content: {
      options: ["Noah", "Moses", "David"],
      correctIndices: [0],
    },
  },
  timeRemaining: 30,
  revealStep: 2,
  timerPaused: false,
  teams: [
    {
      id: "team-1",
      name: "Alpha",
      color: "#ff0000",
      score: 12,
      streak: 0,
      lastAnswerCorrect: true,
      lastAnswer: "Noah",
      isExplicitlySubmitted: true,
      isConnected: true,
    },
    {
      id: "team-2",
      name: "Beta",
      color: "#0000ff",
      score: 8,
      streak: 0,
      lastAnswerCorrect: false,
      lastAnswer: "Moses",
      isExplicitlySubmitted: true,
      isConnected: true,
    },
  ],
};

function buildHookResult(overrides: Record<string, unknown> = {}) {
  return {
    competitions: [selectedComp],
    selectedComp,
    compData: {
      rounds: [
        {
          id: "round-1",
          competitionId: "comp-1",
          orderIndex: 1,
          type: "STANDARD",
          title: "Round 1",
          createdAt: "2026-01-01T00:00:00.000Z",
          questions: [
            {
              ...state.currentQuestion!,
              answers: [{ isCorrect: true }, { isCorrect: false }],
            },
          ],
        },
      ],
    },
    pendingAnswers: [],
    collectedAnswers: [
      {
        teamName: "Alpha",
        color: "#ff0000",
        submittedContent: "Noah",
        isCorrect: null,
        points: 0,
      },
      {
        teamName: "Beta",
        color: "#0000ff",
        submittedContent: "Moses",
        isCorrect: null,
        points: 0,
      },
    ],
    expandedRounds: { "round-1": true },
    isQuestionPickerOpen: false,
    modalQuestion: null,
    modalAnswers: [],
    selectCompetition: vi.fn(),
    handleBack: vi.fn(),
    startQuestion: vi.fn(),
    startTimer: vi.fn(),
    pauseTimer: vi.fn(),
    resumeTimer: vi.fn(),
    revealAnswer: vi.fn(),
    handleNext: vi.fn(),
    gradeAnswer: vi.fn(),
    toggleRound: vi.fn(),
    openQuestionPicker: vi.fn(),
    closeQuestionPicker: vi.fn(),
    openAnswersModal: vi.fn(),
    closeAnswersModal: vi.fn(),
    showLeaderboard: vi.fn(),
    ...overrides,
  };
}

describe("HostDashboard", () => {
  beforeEach(() => {
    vi.mocked(useGame).mockReturnValue({
      state,
      dispatch: vi.fn(),
    });
    vi.mocked(useAuth).mockReturnValue({
      hostToken: "host-token",
      adminToken: null,
      role: "host",
      isHostAuthenticated: true,
      isAdminAuthenticated: false,
      loginHost: vi.fn(),
      loginAdmin: vi.fn(),
      logoutHost: vi.fn(),
      logoutAdmin: vi.fn(),
    });
    mockUseHostDashboard.mockReset();
  });

  it("renders the presenter-first host layout with question, answers, timer, and next button", () => {
    mockUseHostDashboard.mockReturnValue(buildHookResult());

    const view = render(<HostDashboard />);

    expect(view.container.querySelector('[data-testid="host-presenter-question"]')?.textContent).toContain("Who built the ark?");
    expect(view.container.querySelector('[data-testid="host-presenter-answer-content"]')?.textContent).toContain("Noah");
    expect(view.container.querySelector('[data-testid="host-presenter-answer-content"]')?.textContent).toContain("Moses");
    expect(view.container.querySelector('[data-testid="host-presenter-answer-content"]')?.textContent).toContain("host.option_hidden");
    expect(view.container.querySelector('[data-testid="host-timer"]')?.textContent).toBe("30s");
    expect(view.container.querySelector('[data-testid="host-next-action"]')).not.toBeNull();
    expect(view.container.querySelector("table")).toBeNull();

    view.unmount();
  });

  it("delegates secondary workflows to the question picker and answers modals", () => {
    const hookResult = buildHookResult();
    mockUseHostDashboard.mockReturnValue(hookResult);

    const view = render(<HostDashboard />);

    click(view.container.querySelector('[data-testid="host-open-question-picker"]') as HTMLElement);
    click(view.container.querySelector('[data-testid="host-open-answers-modal"]') as HTMLElement);

    expect(hookResult.openQuestionPicker).toHaveBeenCalled();
    expect(hookResult.openAnswersModal).toHaveBeenCalledWith("question-1", "Who built the ark?");

    mockUseHostDashboard.mockReturnValue(
      buildHookResult({
        isQuestionPickerOpen: true,
        modalQuestion: { id: "question-1", text: "Who built the ark?" },
        modalAnswers: [
          {
            teamName: "Alpha",
            color: "#ff0000",
            submittedContent: "Noah",
            isCorrect: true,
            points: 10,
          },
        ],
      }),
    );

    view.rerender(<HostDashboard />);

    expect(view.container.querySelector('[data-testid="host-question-picker-modal"]')).not.toBeNull();
    expect(view.container.querySelector('[data-testid="host-answers-modal"]')).not.toBeNull();
    expect(view.container.querySelector('[data-testid="host-question-option-question-1"]')).not.toBeNull();
    expect(view.container.textContent).toContain("Alpha");

    view.unmount();
  });
});

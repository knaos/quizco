import { describe, expect, it, vi } from "vitest";
import type {
  ClosedQuestion,
  CrosswordQuestion,
  GameState,
  MultipleChoiceQuestion,
  OpenWordQuestion,
} from "@quizco/shared";
import { click, render } from "../../test/render";
import { PublicQuestionBody } from "./PublicQuestionBody";

const question: MultipleChoiceQuestion = {
  id: "question-1",
  roundId: "round-1",
  questionText: "Choose one",
  type: "MULTIPLE_CHOICE",
  points: 10,
  timeLimitSeconds: 30,
  grading: "AUTO",
  content: {
    options: ["One", "Two"],
    correctIndices: [1],
  },
};

const state: GameState = {
  phase: "QUESTION_ACTIVE",
  currentQuestion: question,
  timeRemaining: 22,
  teams: [],
  revealStep: 0,
  timerPaused: false,
};

const crosswordQuestion: CrosswordQuestion = {
  id: "question-2",
  roundId: "round-1",
  questionText: "Fill the crossword",
  type: "CROSSWORD",
  points: 10,
  timeLimitSeconds: 30,
  grading: "AUTO",
  content: {
    grid: [["A", "B"], ["", "C"]],
    clues: {
      across: [
        {
          number: 1,
          x: 0,
          y: 0,
          direction: "across",
          clue: "First row",
          answer: "AB",
        },
      ],
      down: [
        {
          number: 2,
          x: 1,
          y: 0,
          direction: "down",
          clue: "Second column",
          answer: "BC",
        },
      ],
    },
  },
};

const closedQuestion: ClosedQuestion = {
  id: "question-3",
  roundId: "round-1",
  questionText: "Name the builder",
  type: "CLOSED",
  points: 10,
  timeLimitSeconds: 30,
  grading: "AUTO",
  content: {
    options: ["Noah"],
  },
};

const openWordQuestion: OpenWordQuestion = {
  id: "question-4",
  roundId: "round-1",
  questionText: "Type the answer",
  type: "OPEN_WORD",
  points: 10,
  timeLimitSeconds: 30,
  grading: "AUTO",
  content: {
    answer: "Noah",
  },
};

describe("PublicQuestionBody", () => {
  it("renders read-only active question content without submit controls", () => {
    const view = render(
      <PublicQuestionBody
        mode="readOnly"
        state={state}
        answer=""
        selectedIndices={[]}
        setAnswer={vi.fn()}
        toggleIndex={vi.fn()}
        submitAnswer={vi.fn()}
        hasSubmitted={false}
        submissionStatus="idle"
        testIdPrefix="audience"
      />,
    );

    expect(view.container.textContent).toContain("Choose one");
    expect(view.container.textContent).toContain("One");
    expect(view.container.textContent).toContain("Two");
    expect(
      view.container.querySelector('[data-testid="player-submit-answer"]'),
    ).toBeNull();
    expect(
      view.container.querySelector('[data-testid="audience-choice-0"]'),
    ).not.toBeNull();

    view.unmount();
  });

  it("keeps interactive multiple-choice controls wired after the refactor", () => {
    const toggleIndex = vi.fn();
    const submitAnswer = vi.fn();
    const view = render(
      <PublicQuestionBody
        mode="interactive"
        state={state}
        answer=""
        selectedIndices={[1]}
        setAnswer={vi.fn()}
        toggleIndex={toggleIndex}
        submitAnswer={submitAnswer}
        hasSubmitted={false}
        submissionStatus="idle"
      />,
    );

    const choice = view.container.querySelector(
      '[data-testid="player-choice-0"]',
    );
    const submit = view.container.querySelector(
      '[data-testid="player-submit-answer"]',
    );

    expect(choice).not.toBeNull();
    expect(submit).not.toBeNull();

    click(choice as HTMLElement);
    click(submit as HTMLElement);

    expect(toggleIndex).toHaveBeenCalledWith(0);
    expect(submitAnswer).toHaveBeenCalledWith([1], true);

    view.unmount();
  });

  it("shows the section badge for individual-play questions", () => {
    const sectionState: GameState = {
      ...state,
      currentQuestion: {
        ...question,
        section: "Player A",
      },
    };

    const view = render(
      <PublicQuestionBody
        mode="readOnly"
        state={sectionState}
        answer=""
        selectedIndices={[]}
        setAnswer={vi.fn()}
        toggleIndex={vi.fn()}
        submitAnswer={vi.fn()}
        hasSubmitted={false}
        submissionStatus="idle"
      />,
    );

    expect(view.container.textContent).toContain("Turn: Player A");

    view.unmount();
  });

  it("renders crossword questions in read-only mode for the audience", () => {
    const crosswordState: GameState = {
      ...state,
      currentQuestion: crosswordQuestion,
    };

    const view = render(
      <PublicQuestionBody
        mode="readOnly"
        state={crosswordState}
        answer=""
        selectedIndices={[]}
        setAnswer={vi.fn()}
        toggleIndex={vi.fn()}
        submitAnswer={vi.fn()}
        hasSubmitted={false}
        submissionStatus="idle"
        testIdPrefix="audience"
      />,
    );

    expect(view.container.textContent).toContain("Fill the crossword");
    expect(view.container.textContent).toContain("First row");
    expect(view.container.textContent).toContain("Second column");
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
    expect(view.container.textContent).not.toContain("Request Joker");

    view.unmount();
  });

  it("renders closed questions in read-only mode", () => {
    const view = render(
      <PublicQuestionBody
        mode="readOnly"
        state={{ ...state, currentQuestion: closedQuestion }}
        answer=""
        selectedIndices={[]}
        setAnswer={vi.fn()}
        toggleIndex={vi.fn()}
        submitAnswer={vi.fn()}
        hasSubmitted={false}
        submissionStatus="idle"
        testIdPrefix="audience"
      />,
    );

    expect(view.container.textContent).toContain("Name the builder");
    expect(view.container.textContent).toContain("Noah");
    view.unmount();
  });

  it("renders open-word questions in read-only mode", () => {
    const view = render(
      <PublicQuestionBody
        mode="readOnly"
        state={{ ...state, currentQuestion: openWordQuestion }}
        answer=""
        selectedIndices={[]}
        setAnswer={vi.fn()}
        toggleIndex={vi.fn()}
        submitAnswer={vi.fn()}
        hasSubmitted={false}
        submissionStatus="idle"
        testIdPrefix="audience"
      />,
    );

    expect(view.container.textContent).toContain("Type the answer");
    expect(view.container.textContent).toContain(
      "Audience will see the correct answer after reveal",
    );
    view.unmount();
  });
});

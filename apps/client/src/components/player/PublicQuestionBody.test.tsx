import { describe, expect, it, vi } from "vitest";
import type { GameState, MultipleChoiceQuestion } from "@quizco/shared";
import { render } from "../../test/render";
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
});

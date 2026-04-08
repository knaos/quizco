import { describe, expect, it } from "vitest";
import type { GameState, MultipleChoiceQuestion } from "@quizco/shared";
import { render } from "../../test/render";
import { PublicQuestionPreview } from "./PublicQuestionPreview";

const question: MultipleChoiceQuestion = {
  id: "question-1",
  roundId: "round-1",
  questionText: "Which answer is correct?",
  type: "MULTIPLE_CHOICE",
  points: 10,
  timeLimitSeconds: 30,
  grading: "AUTO",
  index: 0,
  content: {
    options: ["Alpha", "Beta", "Gamma"],
    correctIndices: [1],
  },
};

const state: GameState = {
  phase: "QUESTION_PREVIEW",
  currentQuestion: question,
  timeRemaining: 30,
  teams: [],
  revealStep: 2,
  timerPaused: false,
};

describe("PublicQuestionPreview", () => {
  it("shows only the options revealed by the current reveal step", () => {
    const view = render(<PublicQuestionPreview state={state} testIdPrefix="audience" />);

    expect(view.container.textContent).toContain("Alpha");
    expect(view.container.textContent).toContain("Beta");
    expect(view.container.textContent).not.toContain("Gamma");
    expect(
      view.container.querySelector('[data-testid="audience-preview-option-2"]'),
    ).toBeNull();

    view.unmount();
  });
});

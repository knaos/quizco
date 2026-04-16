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
  it("keeps unrevealed multiple-choice slots mounted so the preview grid stays stable", () => {
    const view = render(<PublicQuestionPreview state={state} testIdPrefix="audience" />);
    const revealedOption = view.container.querySelector(
      '[data-testid="audience-preview-option-1"]',
    );
    const hiddenOption = view.container.querySelector(
      '[data-testid="audience-preview-option-2"]',
    );

    expect(
      view.container.querySelector('[data-testid="audience-preview-options-grid"]'),
    ).not.toBeNull();
    expect(revealedOption?.getAttribute("data-revealed")).toBe("true");
    expect(revealedOption?.textContent).toContain("Beta");
    expect(hiddenOption?.getAttribute("data-revealed")).toBe("false");
    expect(hiddenOption?.querySelector("span")?.className).toContain("invisible");

    view.unmount();
  });
});

import { describe, expect, it, vi } from "vitest";
import type { GameState, MultipleChoiceQuestion } from "@quizco/shared";
import { render } from "../../test/render";
import { QuestionActivePhase } from "./QuestionActivePhase";

const question: MultipleChoiceQuestion = {
  id: "question-1",
  roundId: "round-1",
  questionText: "Choose one",
  type: "MULTIPLE_CHOICE",
  points: 10,
  timeLimitSeconds: 30,
  grading: "AUTO",
  index: 0,
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
  milestones: [],
  revealedMilestones: [],
};

describe("QuestionActivePhase", () => {
  it("keeps interactive controls for players after the public-body refactor", () => {
    const view = render(
      <QuestionActivePhase
        state={state}
        hasSubmitted={false}
        selectedIndices={[]}
        answer=""
        setAnswer={vi.fn()}
        toggleIndex={vi.fn()}
        submitAnswer={vi.fn()}
        submissionStatus="idle"
      />,
    );

    expect(
      view.container.querySelector('[data-testid="player-choice-0"]'),
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-testid="player-submit-answer"]'),
    ).not.toBeNull();

    view.unmount();
  });
});

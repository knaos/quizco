import { describe, expect, it } from "vitest";
import type { GameState, Question } from "@quizco/shared";
import { render } from "../../test/render";
import { AudienceRevealPhase } from "./AudienceRevealPhase";

function buildRevealState(question: Question): GameState {
  return {
    phase: "REVEAL_ANSWER",
    currentQuestion: question,
    timeRemaining: 0,
    teams: [],
    revealStep: 0,
    timerPaused: false,
  };
}

describe("AudienceRevealPhase", () => {
  it("renders fallback correct-answer text and audience stats for simple questions", () => {
    const state = buildRevealState({
      id: "question-open",
      roundId: "round-1",
      questionText: "Name the virtue",
      type: "OPEN_WORD",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        answer: "Patience",
      },
    });

    const view = render(
      <AudienceRevealPhase
        state={state}
        stats={{
          totalSubmitted: 4,
          totalCorrect: 3,
          correctPercentage: 75,
        }}
      />,
    );

    expect(
      view.container.querySelector('[data-testid="audience-correct-answer"]'),
    ).not.toBeNull();
    expect(view.container.textContent).toContain("Patience");
    expect(view.container.textContent).toContain("3/4 teams correct (75%)");

    view.unmount();
  });

  it("builds and renders the fully-correct chronology reveal for the audience", () => {
    const state = buildRevealState({
      id: "question-chronology",
      roundId: "round-1",
      questionText: "Put the judges in order",
      type: "CHRONOLOGY",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        items: [
          { id: "item-2", text: "Deborah", order: 1 },
          { id: "item-1", text: "Othniel", order: 0 },
          { id: "item-3", text: "Gideon", order: 2 },
        ],
      },
    });

    const view = render(<AudienceRevealPhase state={state} stats={null} />);

    expect(view.container.textContent).toContain("Othniel");
    expect(view.container.textContent).toContain("Deborah");
    expect(view.container.textContent).toContain("Gideon");
    expect(
      view.container.querySelector('[data-testid="audience-correct-answer"]'),
    ).toBeNull();

    view.unmount();
  });

  it("renders multiple-choice answers without pretending the audience submitted them", () => {
    const state = buildRevealState({
      id: "question-mc",
      roundId: "round-1",
      questionText: "Choose the right option",
      type: "MULTIPLE_CHOICE",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        options: ["Wrong", "Right"],
        correctIndices: [1],
      },
    });

    const view = render(<AudienceRevealPhase state={state} stats={null} />);

    expect(view.container.textContent).toContain("Wrong");
    expect(view.container.textContent).toContain("Right");
    expect(view.container.textContent).not.toContain("Your Choice");
    expect(view.container.textContent).not.toContain("No answer submitted");

    view.unmount();
  });
});

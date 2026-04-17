import { describe, expect, it } from "vitest";
import type { MultipleChoiceQuestion } from "@quizco/shared";
import { render } from "../../test/render";
import { MultipleChoiceReveal } from "./MultipleChoiceReveal";

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
    options: ["Wrong", "Right"],
    correctIndices: [1],
  },
};

describe("MultipleChoiceReveal", () => {
  it("shows selection labels in interactive mode", () => {
    const view = render(
      <MultipleChoiceReveal question={question} lastAnswer={[1]} />,
    );

    expect(view.container.textContent).toContain("Your Choice");
    expect(view.container.textContent).toContain("Right");

    view.unmount();
  });

  it("renders neutral audience reveal without selection labels", () => {
    const view = render(
      <MultipleChoiceReveal
        question={question}
        lastAnswer={question.content.correctIndices}
        showSelectionLabels={false}
      />,
    );

    expect(view.container.textContent).toContain("Wrong");
    expect(view.container.textContent).toContain("Right");
    expect(view.container.textContent).not.toContain("Your Choice");
    expect(view.container.textContent).not.toContain("No answer submitted");

    view.unmount();
  });
});

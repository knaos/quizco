import { describe, expect, it } from "vitest";
import type { Question } from "@quizco/shared";
import { hasMeaningfulPartialAnswer } from "./answerGuards";

const baseQuestion = {
  id: "q1",
  roundId: "r1",
  questionText: "Question",
  points: 10,
  timeLimitSeconds: 30,
  grading: "AUTO" as const,
};

describe("hasMeaningfulPartialAnswer", () => {
  it("does not treat untouched CORRECT_THE_ERROR as partial", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CORRECT_THE_ERROR",
      content: {
        text: "A B C",
        phrases: [
          { text: "A", alternatives: ["A1", "A2", "A3"] },
          { text: "B", alternatives: ["B1", "B2", "B3"] },
        ],
        errorPhraseIndex: 1,
        correctReplacement: "B2",
      },
    };

    expect(
      hasMeaningfulPartialAnswer(question, {
        selectedPhraseIndex: -1,
        correction: "",
      }),
    ).toBe(false);
  });

  it("treats selected phrase in CORRECT_THE_ERROR as partial progress", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CORRECT_THE_ERROR",
      content: {
        text: "A B",
        phrases: [
          { text: "A", alternatives: ["A1", "A2", "A3"] },
          { text: "B", alternatives: ["B1", "B2", "B3"] },
        ],
        errorPhraseIndex: 0,
        correctReplacement: "A2",
      },
    };

    expect(
      hasMeaningfulPartialAnswer(question, {
        selectedPhraseIndex: 0,
        correction: "",
      }),
    ).toBe(true);
  });

  it("does not treat default chronology order as partial", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CHRONOLOGY",
      content: {
        items: [
          { id: "a", text: "A", order: 0 },
          { id: "b", text: "B", order: 1 },
          { id: "c", text: "C", order: 2 },
        ],
      },
    };

    expect(hasMeaningfulPartialAnswer(question, ["a", "b", "c"])).toBe(false);
    expect(hasMeaningfulPartialAnswer(question, ["b", "a", "c"])).toBe(true);
  });
});

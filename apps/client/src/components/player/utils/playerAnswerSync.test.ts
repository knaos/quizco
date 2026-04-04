import { describe, expect, it } from "vitest";
import type { Question } from "@quizco/shared";
import { getHydratedPlayerAnswerState } from "./playerAnswerSync";

const baseQuestion = {
  id: "q1",
  roundId: "r1",
  questionText: "Question",
  points: 10,
  timeLimitSeconds: 30,
  grading: "AUTO" as const,
};

describe("getHydratedPlayerAnswerState", () => {
  it("restores persisted multiple choice answer and selected indices", () => {
    const question: Question = {
      ...baseQuestion,
      type: "MULTIPLE_CHOICE",
      content: { options: ["A", "B"], correctIndices: [1] },
    };

    const state = getHydratedPlayerAnswerState(question, [1]);
    expect(state.answer).toEqual([1]);
    expect(state.selectedIndices).toEqual([1]);
  });

  it("returns untouched TRUE_FALSE as null and restores persisted boolean", () => {
    const question: Question = {
      ...baseQuestion,
      type: "TRUE_FALSE",
      content: { isTrue: true },
    };

    expect(getHydratedPlayerAnswerState(question, null).answer).toBeNull();
    expect(getHydratedPlayerAnswerState(question, true).answer).toBe(true);
  });

  it("returns default chronology board answer when untouched", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CHRONOLOGY",
      content: {
        items: [
          { id: "c", text: "C", order: 2 },
          { id: "a", text: "A", order: 0 },
          { id: "b", text: "B", order: 1 },
        ],
      },
    };

    const state = getHydratedPlayerAnswerState(question, null);
    expect(state.answer).toEqual({
      slotIds: [null, null, null],
      poolIds: ["c", "a", "b"],
    });
  });

  it("restores persisted chronology board answer", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CHRONOLOGY",
      content: {
        items: [
          { id: "c", text: "C", order: 2 },
          { id: "a", text: "A", order: 0 },
          { id: "b", text: "B", order: 1 },
        ],
      },
    };

    const state = getHydratedPlayerAnswerState(question, {
      slotIds: ["a", null, null],
      poolIds: ["c", "b"],
    });
    expect(state.answer).toEqual({
      slotIds: ["a", null, null],
      poolIds: ["c", "b"],
    });
  });

  it("restores crossword grid and builds empty grid when untouched", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CROSSWORD",
      content: {
        grid: [
          ["A", "B"],
          ["", "C"],
        ],
        clues: { across: [], down: [] },
      },
    };

    const restoredGrid = [
      ["A", "B"],
      ["", "D"],
    ];
    expect(getHydratedPlayerAnswerState(question, restoredGrid).answer).toEqual(
      restoredGrid,
    );
    expect(getHydratedPlayerAnswerState(question, null).answer).toEqual([
      ["", ""],
      ["", ""],
    ]);
  });

  it("keeps untouched closed/open answers as empty string and restores persisted string", () => {
    const closedQuestion: Question = {
      ...baseQuestion,
      type: "CLOSED",
      content: { options: ["yes"] },
    };

    expect(getHydratedPlayerAnswerState(closedQuestion, null).answer).toBe("");
    expect(getHydratedPlayerAnswerState(closedQuestion, "yes").answer).toBe(
      "yes",
    );
  });
});

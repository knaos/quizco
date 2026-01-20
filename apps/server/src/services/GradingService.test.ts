import { describe, it, expect } from "vitest";
import { GradingService } from "./GradingService";
import { Question } from "@quizco/shared";

describe("GradingService", () => {
  const service = new GradingService();

  const baseQuestion: Question = {
    id: "1",
    roundId: "r1",
    questionText: "Test",
    type: "MULTIPLE_CHOICE",
    points: 10,
    timeLimitSeconds: 30,
    grading: "AUTO",
    content: { options: [], correctIndices: [0] },
  };

  it("grades MULTIPLE_CHOICE correctly", () => {
    const question: Question = {
      ...baseQuestion,
      type: "MULTIPLE_CHOICE",
      content: { options: ["A", "B", "C"], correctIndices: [1] },
    };

    expect(service.gradeAnswer(question, [1])).toEqual({
      isCorrect: true,
      score: 10,
    });
    expect(service.gradeAnswer(question, [0])).toEqual({
      isCorrect: false,
      score: 0,
    });
  });

  it("grades CLOSED correctly (case insensitive)", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CLOSED",
      content: { options: ["Paris", "La Ville Lumiere"] },
    };

    expect(service.gradeAnswer(question, "Paris")).toEqual({
      isCorrect: true,
      score: 10,
    });
    expect(service.gradeAnswer(question, "paris ")).toEqual({
      isCorrect: true,
      score: 10,
    });
    expect(service.gradeAnswer(question, "London")).toEqual({
      isCorrect: false,
      score: 0,
    });
  });

  it("grades CROSSWORD correctly", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CROSSWORD",
      content: {
        grid: [
          ["A", "B"],
          ["C", "D"],
        ],
        clues: { across: [], down: [] },
      },
    };

    const correctGrid = [
      ["A", "B"],
      ["C", "D"],
    ];
    const incorrectGrid = [
      ["A", "B"],
      ["C", "X"],
    ];

    expect(service.gradeAnswer(question, correctGrid)).toEqual({
      isCorrect: true,
      score: 10,
    });
    expect(service.gradeAnswer(question, incorrectGrid)).toEqual({
      isCorrect: false,
      score: 0,
    });
  });

  it("returns null for MANUAL grading", () => {
    const question: Question = {
      ...baseQuestion,
      grading: "MANUAL",
    };

    expect(service.gradeAnswer(question, "some answer")).toBeNull();
  });

  it("grades FILL_IN_THE_BLANKS correctly", () => {
    const question: Question = {
      ...baseQuestion,
      type: "FILL_IN_THE_BLANKS",
      content: {
        text: "The {0} is {1}.",
        blanks: [
          {
            options: [
              { value: "sky", isCorrect: true },
              { value: "sea", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "blue", isCorrect: true },
              { value: "red", isCorrect: false },
            ],
          },
        ],
      },
    };

    expect(service.gradeAnswer(question, ["sky", "blue"])).toEqual({
      isCorrect: true,
      score: 10,
    });
    expect(service.gradeAnswer(question, ["SKY ", " Blue"])).toEqual({
      isCorrect: true,
      score: 10,
    });
    expect(service.gradeAnswer(question, ["sky", "red"])).toEqual({
      isCorrect: false,
      score: 0,
    });
    expect(service.gradeAnswer(question, ["sea", "blue"])).toEqual({
      isCorrect: false,
      score: 0,
    });
    expect(service.gradeAnswer(question, ["sky"])).toEqual({
      isCorrect: false,
      score: 0,
    });
  });

  it("grades MATCHING correctly", () => {
    const question: Question = {
      ...baseQuestion,
      type: "MATCHING",
      content: {
        pairs: [
          { id: "1", left: "France", right: "Paris" },
          { id: "2", left: "Germany", right: "Berlin" },
        ],
      },
    };

    expect(
      service.gradeAnswer(question, { "1": "Paris", "2": "Berlin" })
    ).toEqual({
      isCorrect: true,
      score: 10,
    });
    expect(
      service.gradeAnswer(question, { "1": "Paris", "2": "Munich" })
    ).toEqual({
      isCorrect: false,
      score: 0,
    });
    expect(service.gradeAnswer(question, { "1": "Paris" })).toEqual({
      isCorrect: false,
      score: 0,
    });
  });

  it("grades CHRONOLOGY correctly with partial credit and bonus", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CHRONOLOGY",
      content: {
        items: [
          { id: "a", text: "First", order: 0 },
          { id: "b", text: "Second", order: 1 },
          { id: "c", text: "Third", order: 2 },
        ],
      },
    };

    // Perfect match: 3 correct + 3 bonus = 6
    expect(service.gradeAnswer(question, ["a", "b", "c"])).toEqual({
      isCorrect: true,
      score: 6,
    });

    // Partial match: 1 correct (at index 0) = 1
    expect(service.gradeAnswer(question, ["a", "c", "b"])).toEqual({
      isCorrect: false,
      score: 1,
    });

    // Zero correct: 0
    expect(service.gradeAnswer(question, ["b", "c", "a"])).toEqual({
      isCorrect: false,
      score: 0,
    });

    // All correct but shuffled IDs (this shouldn't happen if IDs are correct)
    // Testing the logic of index matching
    expect(service.gradeAnswer(question, ["a", "b", "x"])).toEqual({
      isCorrect: false,
      score: 2,
    });
  });

  it("grades TRUE_FALSE correctly", () => {
    const question: Question = {
      ...baseQuestion,
      type: "TRUE_FALSE",
      content: { isTrue: true },
    };

    expect(service.gradeAnswer(question, true)).toEqual({
      isCorrect: true,
      score: 10,
    });
    expect(service.gradeAnswer(question, false)).toEqual({
      isCorrect: false,
      score: 0,
    });
  });
});

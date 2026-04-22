import { describe, it, expect } from "vitest";
import { GradingService } from "./GradingService";
import { AnswerContent, Question } from "@quizco/shared";

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
    index: 0,
    realIndex: 0,
    content: { options: [], correctIndices: [0] },
  };

  it("grades MULTIPLE_CHOICE correctly with partial scoring", () => {
    const question: Question = {
      ...baseQuestion,
      type: "MULTIPLE_CHOICE",
      content: { options: ["A", "B", "C"], correctIndices: [1] },
    };

    // Single correct answer: 1 point, isCorrect: true
    expect(service.gradeAnswer(question, [1])).toEqual({
      isCorrect: true,
      score: 1,
    });
    // Wrong answer: 0 points, isCorrect: false
    expect(service.gradeAnswer(question, [0])).toEqual({
      isCorrect: false,
      score: 0,
    });
  });

  it("grades MULTIPLE_CHOICE with multiple correct answers", () => {
    const question: Question = {
      ...baseQuestion,
      type: "MULTIPLE_CHOICE",
      content: { options: ["A", "B", "C", "D"], correctIndices: [1, 2] },
    };

    // All correct: 2 points, isCorrect: true
    expect(service.gradeAnswer(question, [1, 2])).toEqual({
      isCorrect: true,
      score: 2,
    });
    expect(service.gradeAnswer(question, [2, 1])).toEqual({
      isCorrect: true,
      score: 2,
    });

    // Partial: 1 correct, 1 wrong: 1 point, isCorrect: false
    expect(service.gradeAnswer(question, [1, 3])).toEqual({
      isCorrect: false,
      score: 1,
    });

    // Only wrong answers: 0 points, isCorrect: false
    expect(service.gradeAnswer(question, [0, 3])).toEqual({
      isCorrect: false,
      score: 0,
    });

    // Empty answer: 0 points
    expect(service.gradeAnswer(question, [])).toEqual({
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
      score: 13, // 10 points + 3 bonus for no jokers
    });

    expect(service.gradeAnswer(question, incorrectGrid)).toEqual({
      isCorrect: false,
      score: 0,
    });

    expect(
      service.gradeAnswer(question, correctGrid, { usedJokers: true }),
    ).toEqual({
      isCorrect: true,
      score: 10, // No bonus
    });
  });

  it("returns null for MANUAL grading", () => {
    const question: Question = {
      ...baseQuestion,
      grading: "MANUAL",
    };

    expect(service.gradeAnswer(question, "some answer")).toBeNull();
  });

  it("preserves correctness but awards zero points for zero-point questions", () => {
    const question: Question = {
      ...baseQuestion,
      points: 0,
      content: { options: ["A", "B"], correctIndices: [1] },
    };

    expect(service.gradeAnswer(question, [1] as unknown as AnswerContent)).toEqual({
      isCorrect: true,
      score: 0,
    });
    expect(service.gradeAnswer(question, [0] as unknown as AnswerContent)).toEqual({
      isCorrect: false,
      score: 0,
    });
  });

  it("still respects manual grading for zero-point questions", () => {
    const question: Question = {
      ...baseQuestion,
      points: 0,
      grading: "MANUAL",
    };

    expect(service.gradeAnswer(question, [0] as unknown as AnswerContent)).toBeNull();
  });

  it("returns zero-point partial credit for correct-the-error without auto-passing", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CORRECT_THE_ERROR",
      points: 0,
      content: {
        text: "The sky is green",
        words: [
          { wordIndex: 1, text: "sky", alternatives: ["sea", "land"] },
          { wordIndex: 3, text: "green", alternatives: ["blue", "black"] },
        ],
        errorWordIndex: 3,
        correctReplacement: "blue",
      },
    };

    expect(
      service.gradeAnswer(question, {
        selectedWordIndex: 3,
        correction: "blue",
      }),
    ).toEqual({
      isCorrect: true,
      score: 0,
    });

    expect(
      service.gradeAnswer(question, {
        selectedWordIndex: 1,
        correction: "land",
      }),
    ).toEqual({
      isCorrect: false,
      score: 0,
    });
  });

  it("grades FILL_IN_THE_BLANKS correctly with partial scoring", () => {
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

    // All correct: 2 points (1 per blank)
    expect(service.gradeAnswer(question, ["sky", "blue"])).toEqual({
      isCorrect: true,
      score: 2,
    });
    // Case insensitive
    expect(service.gradeAnswer(question, ["SKY ", " Blue"])).toEqual({
      isCorrect: true,
      score: 2,
    });
    // One correct: 1 point
    expect(service.gradeAnswer(question, ["sky", "red"])).toEqual({
      isCorrect: false,
      score: 1,
    });
    // One correct (different blank): 1 point
    expect(service.gradeAnswer(question, ["sea", "blue"])).toEqual({
      isCorrect: false,
      score: 1,
    });
    // Incomplete answer: 0 points
    expect(service.gradeAnswer(question, ["sky"])).toEqual({
      isCorrect: false,
      score: 0,
    });
    // Empty answer: 0 points
    expect(service.gradeAnswer(question, [])).toEqual({
      isCorrect: false,
      score: 0,
    });
  });

  it("grades MATCHING correctly with 1 point per correct match", () => {
    const question: Question = {
      ...baseQuestion,
      type: "MATCHING",
      content: {
        heroes: [
          { id: "h1", text: "France", type: "hero" },
          { id: "h2", text: "Germany", type: "hero" },
          { id: "h3", text: "Spain", type: "hero" },
        ],
        stories: [
          { id: "s1", text: "Paris", type: "story", correspondsTo: "h1" },
          { id: "s2", text: "Berlin", type: "story", correspondsTo: "h2" },
          { id: "s3", text: "Madrid", type: "story", correspondsTo: "h3" },
        ],
      },
    };

    // All 3 correct: 3 points
    expect(
      service.gradeAnswer(question, { "h1": "s1", "h2": "s2", "h3": "s3" }),
    ).toEqual({
      isCorrect: true,
      score: 3,
    });

    // 2 correct: 2 points
    expect(
      service.gradeAnswer(question, { "h1": "s1", "h2": "s2", "h3": "s1" }),
    ).toEqual({
      isCorrect: false,
      score: 2,
    });

    // 1 correct: 1 point
    expect(
      service.gradeAnswer(question, { "h1": "s1", "h2": "s3", "h3": "s2" }),
    ).toEqual({
      isCorrect: false,
      score: 1,
    });

    // 0 correct: 0 points
    expect(
      service.gradeAnswer(question, { "h1": "s2", "h2": "s3", "h3": "s1" }),
    ).toEqual({
      isCorrect: false,
      score: 0,
    });

    // Incomplete answer (only 1 pair submitted, but correct): 1 point
    expect(service.gradeAnswer(question, { "h1": "s1" })).toEqual({
      isCorrect: false,
      score: 1,
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
    expect(
      service.gradeAnswer(question, {
        slotIds: ["a", "b", "c"],
        poolIds: [],
      }),
    ).toEqual({
      isCorrect: true,
      score: 6,
    });

    // Partial match: 1 correct (at index 0) = 1
    expect(
      service.gradeAnswer(question, {
        slotIds: ["a", "c", "b"],
        poolIds: [],
      }),
    ).toEqual({
      isCorrect: false,
      score: 1,
    });

    // Zero correct: 0
    expect(
      service.gradeAnswer(question, {
        slotIds: ["b", "c", "a"],
        poolIds: [],
      }),
    ).toEqual({
      isCorrect: false,
      score: 0,
    });

    // All correct but shuffled IDs (this shouldn't happen if IDs are correct)
    // Testing the logic of index matching
    expect(
      service.gradeAnswer(question, {
        slotIds: ["a", "b", "x"],
        poolIds: [],
      }),
    ).toEqual({
      isCorrect: false,
      score: 2,
    });
  });

  it("grades CHRONOLOGY with mixed slot/pool payloads and deduplicates IDs", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CHRONOLOGY",
      content: {
        items: [
          { id: "a", text: "First", order: 0 },
          { id: "b", text: "Second", order: 1 },
          { id: "c", text: "Third", order: 2 },
          { id: "d", text: "Fourth", order: 3 },
        ],
      },
    };

    // Mixed state: two placed, two still in pool -> final order [a, b, c, d]
    expect(
      service.gradeAnswer(question, {
        slotIds: ["a", "b", null, null],
        poolIds: ["c", "d"],
      }),
    ).toEqual({
      isCorrect: true,
      score: 7,
    });

    // Duplicates and unknown IDs are ignored in reconstruction.
    expect(
      service.gradeAnswer(question, {
        slotIds: ["a", "a", "z", null],
        poolIds: ["b", "b", "c", "d", "a"],
      }),
    ).toEqual({
      isCorrect: true,
      score: 7,
    });
  });

  it("returns zero for malformed CHRONOLOGY payload shapes", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CHRONOLOGY",
      content: {
        items: [
          { id: "a", text: "First", order: 0 },
          { id: "b", text: "Second", order: 1 },
        ],
      },
    };

    expect(
      service.gradeAnswer(question, {
        slotIds: ["a", null],
        poolIds: "b",
      } as unknown as AnswerContent),
    ).toEqual({
      isCorrect: false,
      score: 0,
    });

    expect(
      service.gradeAnswer(question, {
        slotIds: "a",
        poolIds: ["b"],
      } as unknown as AnswerContent),
    ).toEqual({
      isCorrect: false,
      score: 0,
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
      score: 1,
    });
    expect(service.gradeAnswer(question, false)).toEqual({
      isCorrect: false,
      score: 0,
    });
  });

  it("grades CORRECT_THE_ERROR correctly", () => {
    const question: Question = {
      ...baseQuestion,
      type: "CORRECT_THE_ERROR",
      content: {
        text: "Jesus was born in Nazareth",
        words: [
          { wordIndex: 0, text: "Jesus", alternatives: ["Peter", "John", "Paul"] },
          { wordIndex: 4, text: "Nazareth", alternatives: ["Bethlehem", "Jerusalem", "Egypt"] },
        ],
        errorWordIndex: 4,
        correctReplacement: "Bethlehem",
      },
    };

    // 1. Fully correct: 1pt for index, 1pt for replacement = 2
    expect(
      service.gradeAnswer(question, {
        selectedWordIndex: 4,
        correction: "Bethlehem",
      }),
    ).toEqual({
      isCorrect: true,
      score: 2,
    });

    // 2. Correct index, incorrect replacement: 1pt
    expect(
      service.gradeAnswer(question, {
        selectedWordIndex: 4,
        correction: "Jerusalem",
      }),
    ).toEqual({
      isCorrect: false,
      score: 1,
    });

    // 3. Incorrect index, correct replacement: 1pt
    expect(
      service.gradeAnswer(question, {
        selectedWordIndex: 0,
        correction: "Bethlehem",
      }),
    ).toEqual({
      isCorrect: false,
      score: 1,
    });

    // 4. Incorrect index, incorrect replacement: 0pt
    expect(
      service.gradeAnswer(question, {
        selectedWordIndex: 1,
        correction: "wrong",
      }),
    ).toEqual({
      isCorrect: false,
      score: 0,
    });
  });
});

import { describe, expect, it } from "vitest";
import type { Question } from "@quizco/shared";
import i18n from "../../i18n";
import { getQuestionCorrectAnswer } from "./questionText";

const t = i18n.t.bind(i18n);

describe("getQuestionCorrectAnswer", () => {
  it("formats multiple-choice and closed answers", () => {
    const multipleChoiceQuestion: Question = {
      id: "q-mc",
      roundId: "round-1",
      questionText: "Pick all that apply",
      type: "MULTIPLE_CHOICE",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        options: ["Alpha", "Beta", "Gamma"],
        correctIndices: [0, 2],
      },
    };

    const closedQuestion: Question = {
      id: "q-closed",
      roundId: "round-1",
      questionText: "Closed",
      type: "CLOSED",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        options: ["Closed answer"],
      },
    };

    expect(getQuestionCorrectAnswer(multipleChoiceQuestion, t)).toBe(
      "Alpha, Gamma",
    );
    expect(getQuestionCorrectAnswer(closedQuestion, t)).toBe("Closed answer");
  });

  it("formats text-based question answers", () => {
    const openWordQuestion: Question = {
      id: "q-open",
      roundId: "round-1",
      questionText: "Open",
      type: "OPEN_WORD",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        answer: "Mercy",
      },
    };

    const trueFalseQuestion: Question = {
      id: "q-true-false",
      roundId: "round-1",
      questionText: "True or false",
      type: "TRUE_FALSE",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        isTrue: false,
      },
    };

    const correctTheErrorQuestion: Question = {
      id: "q-cte",
      roundId: "round-1",
      questionText: "Correct the error",
      type: "CORRECT_THE_ERROR",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        text: "This phrase is good",
        phrases: [
          {
            text: "was",
            alternatives: ["were", "is"],
          },
          {
            text: "good",
            alternatives: ["bad", "better"],
          },
        ],
        errorPhraseIndex: 1,
        correctReplacement: "better",
      },
    };

    expect(getQuestionCorrectAnswer(openWordQuestion, t)).toBe("Mercy");
    expect(getQuestionCorrectAnswer(trueFalseQuestion, t)).toBe("False");
    expect(getQuestionCorrectAnswer(correctTheErrorQuestion, t)).toBe(
      "good -> better",
    );
  });

  it("formats structured question answers", () => {
    const fillInTheBlanksQuestion: Question = {
      id: "q-fill",
      roundId: "round-1",
      questionText: "Fill in the blanks",
      type: "FILL_IN_THE_BLANKS",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        text: "___ and ___",
        blanks: [
          {
            options: [
              { value: "Hope", isCorrect: false },
              { value: "Faith", isCorrect: true },
            ],
          },
          {
            options: [{ value: "Love", isCorrect: true }],
          },
        ],
      },
    };

    const matchingQuestion: Question = {
      id: "q-match",
      roundId: "round-1",
      questionText: "Match",
      type: "MATCHING",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        pairs: [
          { id: "pair-1", left: "Paul", right: "Apostle" },
          { id: "pair-2", left: "David", right: "King" },
        ],
      },
    };

    const chronologyQuestion: Question = {
      id: "q-chrono",
      roundId: "round-1",
      questionText: "Order the events",
      type: "CHRONOLOGY",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        items: [
          { id: "item-2", text: "Second", order: 1 },
          { id: "item-1", text: "First", order: 0 },
          { id: "item-3", text: "Third", order: 2 },
        ],
      },
    };

    const crosswordQuestion: Question = {
      id: "q-crossword",
      roundId: "round-1",
      questionText: "Crossword",
      type: "CROSSWORD",
      points: 10,
      timeLimitSeconds: 30,
      grading: "AUTO",
      content: {
        grid: [["A"]],
        clues: {
          across: [],
          down: [],
        },
      },
    };

    expect(getQuestionCorrectAnswer(fillInTheBlanksQuestion, t)).toBe(
      "Faith, Love",
    );
    expect(getQuestionCorrectAnswer(matchingQuestion, t)).toBe(
      "Paul -> Apostle | David -> King",
    );
    expect(getQuestionCorrectAnswer(chronologyQuestion, t)).toBe(
      "First -> Second -> Third",
    );
    expect(getQuestionCorrectAnswer(crosswordQuestion, t)).toBe(
      i18n.t("player.see_grid"),
    );
  });
});

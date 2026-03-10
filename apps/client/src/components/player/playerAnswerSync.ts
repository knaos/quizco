import type {
  AnswerContent,
  ChronologyContent,
  CrosswordContent,
  Question,
} from "@quizco/shared";
import {
  isCorrectTheErrorAnswer,
  isNumberArray,
  isRecordOfStringValues,
  isStringArray,
  isStringGrid,
} from "../../utils/answerGuards";

export interface HydratedPlayerAnswerState {
  answer: AnswerContent | null;
  selectedIndices: number[];
}

export const getHydratedPlayerAnswerState = (
  question: Question,
  persistedAnswer: AnswerContent | null | undefined,
): HydratedPlayerAnswerState => {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
      if (isNumberArray(persistedAnswer)) {
        // Keep button highlight state in sync with restored answer.
        return { answer: persistedAnswer, selectedIndices: persistedAnswer };
      }
      return { answer: [], selectedIndices: [] };

    case "FILL_IN_THE_BLANKS":
      return {
        answer: isStringArray(persistedAnswer) ? persistedAnswer : [],
        selectedIndices: [],
      };

    case "MATCHING":
      return {
        answer: isRecordOfStringValues(persistedAnswer) ? persistedAnswer : {},
        selectedIndices: [],
      };

    case "CHRONOLOGY":
      if (isStringArray(persistedAnswer)) {
        return { answer: persistedAnswer, selectedIndices: [] };
      }
      // Fallback mirrors current shuffled order from server-authoritative question payload.
      return {
        answer: (question.content as ChronologyContent).items.map((item) => item.id),
        selectedIndices: [],
      };

    case "TRUE_FALSE":
      // Null represents untouched state; we intentionally do not default to true/false.
      return {
        answer: typeof persistedAnswer === "boolean" ? persistedAnswer : null,
        selectedIndices: [],
      };

    case "CORRECT_THE_ERROR":
      return {
        answer: isCorrectTheErrorAnswer(persistedAnswer)
          ? persistedAnswer
          : { selectedPhraseIndex: -1, correction: "" },
        selectedIndices: [],
      };

    case "CROSSWORD":
      if (isStringGrid(persistedAnswer)) {
        return { answer: persistedAnswer, selectedIndices: [] };
      }
      // Preserve grid shape so UI stays stable even when no progress was saved.
      return {
        answer: (question.content as CrosswordContent).grid.map((row) =>
          row.map(() => ""),
        ),
        selectedIndices: [],
      };

    case "CLOSED":
    case "OPEN_WORD":
      return {
        answer: typeof persistedAnswer === "string" ? persistedAnswer : "",
        selectedIndices: [],
      };
  }
};

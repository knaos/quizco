import type {
  AnswerContent,
  ChronologyContent,
  CrosswordContent,
  Question,
} from "@quizco/shared";
import {
  isChronologyAnswer,
  isCorrectTheErrorAnswer,
  isNumberArray,
  isRecordOfStringValues,
  isStringGrid,
} from "../../../utils/answerGuards";

const emptyGridCache = new Map<string, string[][]>();

const getEmptyCrosswordGrid = (questionId: string, gridTemplate: string[][]): string[][] => {
  if (!emptyGridCache.has(questionId)) {
    emptyGridCache.set(questionId, gridTemplate.map((row) => row.map(() => "")));
  }
  return emptyGridCache.get(questionId)!;
};

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
        answer:
          Array.isArray(persistedAnswer) &&
          persistedAnswer.every((item) => typeof item === "string")
            ? persistedAnswer
            : [],
        selectedIndices: [],
      };

    case "MATCHING":
      return {
        answer: isRecordOfStringValues(persistedAnswer) ? persistedAnswer : {},
        selectedIndices: [],
      };

    case "CHRONOLOGY":
      if (isChronologyAnswer(persistedAnswer)) {
        return { answer: persistedAnswer, selectedIndices: [] };
      }
      // Fallback keeps all items in left column before any drag/drop interaction.
      return {
        answer: {
          slotIds: (question.content as ChronologyContent).items.map(() => null),
          poolIds: (question.content as ChronologyContent).items.map(
            (item) => item.id,
          ),
        },
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
          : { selectedWordIndex: -1, correction: "" },
        selectedIndices: [],
      };

    case "CROSSWORD":
      if (isStringGrid(persistedAnswer)) {
        return { answer: persistedAnswer, selectedIndices: [] };
      }
      // Preserve grid shape so UI stays stable even when no progress was saved.
      return {
        answer: getEmptyCrosswordGrid(question.id, (question.content as CrosswordContent).grid),
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

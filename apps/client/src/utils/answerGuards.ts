import type {
  AnswerContent,
  ChronologyContent,
  CorrectTheErrorAnswer,
  Question,
} from "@quizco/shared";

export const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((v) => typeof v === "number");

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

export const isStringGrid = (value: unknown): value is string[][] =>
  Array.isArray(value) &&
  value.every(
    (row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"),
  );

export const isRecordOfStringValues = (
  value: unknown,
): value is Record<string, string> =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every((v) => typeof v === "string");

export const isCorrectTheErrorAnswer = (
  value: unknown,
): value is CorrectTheErrorAnswer =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  typeof (value as CorrectTheErrorAnswer).selectedPhraseIndex === "number" &&
  typeof (value as CorrectTheErrorAnswer).correction === "string";

export const hasMeaningfulPartialAnswer = (
  question: Question,
  answer: AnswerContent | null | undefined,
): boolean => {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
      return isNumberArray(answer) && answer.length > 0;

    case "FILL_IN_THE_BLANKS":
      return (
        isStringArray(answer) && answer.some((value) => value.trim().length > 0)
      );

    case "MATCHING":
      return isRecordOfStringValues(answer) && Object.keys(answer).length > 0;

    case "CHRONOLOGY": {
      if (!isStringArray(answer)) return false;
      const initialOrder = (question.content as ChronologyContent).items.map(
        (item) => item.id,
      );
      if (answer.length !== initialOrder.length) return true;
      return answer.some((itemId, index) => itemId !== initialOrder[index]);
    }

    case "TRUE_FALSE":
      return typeof answer === "boolean";

    case "CORRECT_THE_ERROR":
      return (
        isCorrectTheErrorAnswer(answer) &&
        (answer.selectedPhraseIndex !== -1 || answer.correction.trim().length > 0)
      );

    case "CROSSWORD":
      return (
        isStringGrid(answer) &&
        answer.some((row) => row.some((cell) => cell.trim().length > 0))
      );

    case "CLOSED":
    case "OPEN_WORD":
      return typeof answer === "string" && answer.trim().length > 0;
  }
};

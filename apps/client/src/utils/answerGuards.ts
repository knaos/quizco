import type { CorrectTheErrorAnswer } from "@quizco/shared";

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

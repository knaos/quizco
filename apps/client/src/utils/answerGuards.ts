import type { ChronologyAnswer, CorrectTheErrorAnswer } from "@quizco/shared";

export const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((v) => typeof v === "number");

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

export const isStringGrid = (value: unknown): value is string[][] =>
  Array.isArray(value) &&
  value.every(
    (row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"),
  );

/**
 * Runtime guard for chronology answers sent/received over sockets.
 */
export const isChronologyAnswer = (
  value: unknown,
): value is ChronologyAnswer =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Array.isArray((value as ChronologyAnswer).slotIds) &&
  (value as ChronologyAnswer).slotIds.every(
    (slotId) => slotId === null || typeof slotId === "string",
  ) &&
  Array.isArray((value as ChronologyAnswer).poolIds) &&
  (value as ChronologyAnswer).poolIds.every((poolId) => typeof poolId === "string");

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

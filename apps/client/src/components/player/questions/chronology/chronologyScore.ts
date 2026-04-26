import type { ChronologyAnswer, ChronologyContent } from "@quizco/shared";

/**
 * Calculates the partial score for CHRONOLOGY questions.
 * Scores 2 points per item in each correctly placed consecutive run (min 2 items).
 * +3 bonus for perfect match when all items placed in correct continuous order.
 *
 * @param content - The chronology question content with items
 * @param answer - The team's submitted answer
 * @returns The number of correctly positioned items
 */
export interface ChronologyScoreResult {
  correctCount: number;
  placedCount: number;
  totalItems: number;
  score: number;
}

export function calculateChronologyScore(
  content: ChronologyContent,
  answer: ChronologyAnswer | null,
): ChronologyScoreResult {
  if (!answer || !Array.isArray(answer.slotIds) || !Array.isArray(answer.poolIds)) {
    return { correctCount: 0, placedCount: 0, totalItems: content.items.length, score: 0 };
  }

  const items = [...content.items].sort((a, b) => a.order - b.order);
  const correctOrderIds = items.map((item) => item.id);
  const totalItems = correctOrderIds.length;

  const placedIds = answer.slotIds.filter(
    (id, index): id is string =>
      typeof id === "string" &&
      correctOrderIds.includes(id) &&
      answer.slotIds.indexOf(id) === index,
  );
  const placedCount = placedIds.length;

  if (placedCount < 2) {
    return { correctCount: 0, placedCount, totalItems, score: 0 };
  }

  const correctOrderIndex = new Map(correctOrderIds.map((id, idx) => [id, idx]));

  let score = 0;
  let correctCount = 0;
  let runLength = 1;
  const runs: number[] = [];

  for (let i = 1; i < placedCount; i++) {
    const prevId = placedIds[i - 1];
    const currId = placedIds[i];
    const prevOrder = correctOrderIndex.get(prevId) ?? -1;
    const currOrder = correctOrderIndex.get(currId) ?? -1;

    if (currOrder === prevOrder + 1) {
      runLength++;
    } else {
      if (runLength >= 2) {
        runs.push(runLength);
        correctCount += runLength;
        score += runLength * 2;
      }
      runLength = 1;
    }
  }

  if (runLength >= 2) {
    runs.push(runLength);
    correctCount += runLength;
    score += runLength * 2;
  }

  const isPerfect =
    placedCount === totalItems && runs.length === 1 && runs[0] === totalItems;
  score += isPerfect ? 3 : 0;

  return { correctCount, placedCount, totalItems, score };
}

/**
 * Gets the total number of items in a chronology question
 */
export function getChronologyTotalItems(content: ChronologyContent): number {
  return content.items.length;
}

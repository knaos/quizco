import type { ChronologyAnswer, ChronologyContent } from "@quizco/shared";
import { buildChronologyOrderForGrading } from "./chronologyBoard";

/**
 * Calculates the partial score for CHRONOLOGY questions.
 * Returns the number of correctly positioned items (out of total).
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

  const submittedOrderIds = buildChronologyOrderForGrading(answer);
  const placedCount = submittedOrderIds.length;

  let correctCount = 0;
  for (let i = 0; i < placedCount; i++) {
    if (submittedOrderIds[i] === correctOrderIds[i]) {
      correctCount++;
    }
  }

  const isPerfect = correctCount === placedCount && placedCount === totalItems;
  const score = correctCount + (isPerfect ? 3 : 0);

  return { correctCount, placedCount, totalItems, score };
}

/**
 * Gets the total number of items in a chronology question
 */
export function getChronologyTotalItems(content: ChronologyContent): number {
  return content.items.length;
}

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
export function calculateChronologyScore(
  content: ChronologyContent,
  answer: ChronologyAnswer | null,
): number {
  if (!answer || !Array.isArray(answer.slotIds) || !Array.isArray(answer.poolIds)) {
    return 0;
  }

  // Get the correct order based on the 'order' property of items
  const items = [...content.items].sort((a, b) => a.order - b.order);
  const correctOrderIds = items.map((item) => item.id);

  // Build the submitted order using the same logic as the grading
  const submittedOrderIds = buildChronologyOrderForGrading(answer);

  // Count how many items are in the correct position
  let correctCount = 0;
  const totalItems = correctOrderIds.length;

  for (let i = 0; i < totalItems; i++) {
    if (submittedOrderIds[i] === correctOrderIds[i]) {
      correctCount++;
    }
  }

  return correctCount;
}

/**
 * Gets the total number of items in a chronology question
 */
export function getChronologyTotalItems(content: ChronologyContent): number {
  return content.items.length;
}

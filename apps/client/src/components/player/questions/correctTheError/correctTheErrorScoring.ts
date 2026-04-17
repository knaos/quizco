import type { CorrectTheErrorContent } from "@quizco/shared";

/**
 * Calculates the partial score for CORRECT_THE_ERROR question.
 * Returns 0, 1, or 2 based on:
 * - 1 point: correct word identified
 * - 1 point: correct correction selected
 *
 * This mirrors server-side grading in GradingService.
 */
export const calculatePartialScore = (
  content: CorrectTheErrorContent,
  lastAnswer: { selectedWordIndex: number; correction: string } | null,
): number => {
  if (!lastAnswer) {
    return 0;
  }

  let score = 0;

  if (lastAnswer.selectedWordIndex === content.errorWordIndex) {
    score += 1;
  }

  const normalizedCorrection = (lastAnswer.correction || "").trim().toLowerCase();
  const normalizedTarget = content.correctReplacement.trim().toLowerCase();

  if (normalizedCorrection === normalizedTarget) {
    score += 1;
  }

  return score;
};

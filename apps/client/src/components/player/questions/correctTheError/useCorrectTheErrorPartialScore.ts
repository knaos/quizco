import { useMemo } from "react";
import type { CorrectTheErrorAnswer, CorrectTheErrorContent } from "@quizco/shared";

const getCorrectTheErrorPartialScore = (
  content: CorrectTheErrorContent | null | undefined,
  lastAnswer: CorrectTheErrorAnswer | null | undefined
): number => {
  if (!content || !lastAnswer) {
    return 0;
  }

  let score = 0;
  if (lastAnswer.selectedPhraseIndex === content.errorPhraseIndex) {
    score += 1;
  }

  const normalizedCorrection = (lastAnswer.correction || "").trim().toLowerCase();
  const normalizedTarget = content.correctReplacement.trim().toLowerCase();

  if (normalizedCorrection === normalizedTarget) {
    score += 1;
  }

  return score;
};

export const useCorrectTheErrorPartialScore = (
  content: CorrectTheErrorContent | null | undefined,
  lastAnswer: CorrectTheErrorAnswer | null | undefined
): number => {
  return useMemo(
    () => getCorrectTheErrorPartialScore(content, lastAnswer),
    [content, lastAnswer]
  );
};

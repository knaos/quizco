export interface AudienceAnswerRecord {
  isCorrect: boolean | null;
}

export interface AudienceAnswerStats {
  totalSubmitted: number;
  totalCorrect: number;
  correctPercentage: number;
}

export function buildAudienceAnswerStats(
  answers: AudienceAnswerRecord[],
): AudienceAnswerStats | null {
  if (answers.length === 0) {
    return null;
  }

  const totalSubmitted = answers.length;
  const totalCorrect = answers.filter((answer) => answer.isCorrect === true).length;

  return {
    totalSubmitted,
    totalCorrect,
    correctPercentage: Math.round((totalCorrect / totalSubmitted) * 100),
  };
}

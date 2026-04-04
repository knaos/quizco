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
  const gradedAnswers = answers.filter((answer) => answer.isCorrect !== null);

  if (gradedAnswers.length === 0) {
    return null;
  }

  const totalSubmitted = gradedAnswers.length;
  const totalCorrect = gradedAnswers.filter(
    (answer) => answer.isCorrect === true,
  ).length;

  return {
    totalSubmitted,
    totalCorrect,
    correctPercentage: Math.round((totalCorrect / totalSubmitted) * 100),
  };
}

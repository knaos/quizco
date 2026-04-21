import type { AnswerContent } from "@quizco/shared";

const PENDING_FINAL_SUBMISSION_KEY = "quizco_pending_final_submission";

export interface PendingFinalSubmission {
  competitionId: string;
  teamId: string;
  questionId: string;
  answer: AnswerContent;
}

export function getPendingFinalSubmission(): PendingFinalSubmission | null {
  const rawValue = window.localStorage.getItem(PENDING_FINAL_SUBMISSION_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PendingFinalSubmission;
  } catch {
    window.localStorage.removeItem(PENDING_FINAL_SUBMISSION_KEY);
    return null;
  }
}

export function setPendingFinalSubmission(submission: PendingFinalSubmission): void {
  window.localStorage.setItem(
    PENDING_FINAL_SUBMISSION_KEY,
    JSON.stringify(submission),
  );
}

export function clearPendingFinalSubmission(): void {
  window.localStorage.removeItem(PENDING_FINAL_SUBMISSION_KEY);
}

export function isSameAnswer(
  left: AnswerContent | null | undefined,
  right: AnswerContent | null | undefined,
): boolean {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

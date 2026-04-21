import type { AnswerContent } from "@quizco/shared";

const PENDING_FINAL_SUBMISSION_KEY = "quizco_pending_final_submission";

/**
 * Keeps a final submission on disk so the client can replay it after a reconnect
 * without relying on volatile component state.
 */
export interface PendingFinalSubmission {
  competitionId: string;
  teamId: string;
  questionId: string;
  answer: AnswerContent;
}

/**
 * Returns the last final submission only when it can still be trusted as replay
 * input; malformed payloads are dropped so they do not poison future reconnects.
 */
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

/**
 * Persists the exact answer payload that must survive a reconnect boundary.
 */
export function setPendingFinalSubmission(submission: PendingFinalSubmission): void {
  window.localStorage.setItem(
    PENDING_FINAL_SUBMISSION_KEY,
    JSON.stringify(submission),
  );
}

/**
 * Clears replay state once the server has accepted the authoritative answer.
 */
export function clearPendingFinalSubmission(): void {
  window.localStorage.removeItem(PENDING_FINAL_SUBMISSION_KEY);
}

/**
 * Compares answer payloads using serialization because the hook stores mixed
 * scalar and structured answer types and needs a stable equality check.
 */
export function isSameAnswer(
  left: AnswerContent | null | undefined,
  right: AnswerContent | null | undefined,
): boolean {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

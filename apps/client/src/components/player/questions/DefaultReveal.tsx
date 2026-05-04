import React from "react";
import { useTranslation } from "react-i18next";
import type { AnswerContent } from "@quizco/shared";
import { QuestionSource } from "../QuestionSource";

interface DefaultRevealProps {
  lastAnswer?: AnswerContent | null | undefined;
  gradingStatus?: boolean | null | undefined;
  getCorrectAnswer?: () => string;
  source?: string | null;
}

/**
 * Default reveal component for simple question types:
 * - CLOSED
 * - OPEN_WORD
 * - TRUE_FALSE
 * - CORRECT_THE_ERROR
 * 
 * Shows correct answer vs user's answer in a simple two-column layout.
 */
export const DefaultReveal: React.FC<DefaultRevealProps> = ({
  lastAnswer,
  gradingStatus,
  getCorrectAnswer,
  source,
}) => {
  const { t } = useTranslation();

  const correctAnswer = getCorrectAnswer ? getCorrectAnswer() : "";

  // Format the user's answer for display
  const formatUserAnswer = (answer: AnswerContent | null | undefined): string => {
    if (answer === null || answer === undefined || answer === "") {
      return "(No Answer)";
    }
    if (answer === true) {
      return t("game.true");
    }
    if (answer === false) {
      return t("game.false");
    }
    if (Array.isArray(answer)) {
      return answer.join(", ");
    }
    if (typeof answer === "object") {
      return Object.values(answer).join(", ");
    }
    return String(answer);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-200">
          <span className="text-green-600 text-xs font-bold uppercase">
            {t("player.correct_answer")}
          </span>
          <p className="text-2xl font-black text-green-900 mt-1">
            {correctAnswer}
          </p>
        </div>
        <div
          className={`${
            gradingStatus === true
              ? "bg-green-50 border-green-200"
              : gradingStatus === false
              ? "bg-red-50 border-red-200"
              : "bg-gray-50 border-gray-200"
          } p-4 rounded-2xl border-2`}
        >
          <span
            className={`${
              gradingStatus === true
                ? "text-green-600"
                : gradingStatus === false
                ? "text-red-600"
                : "text-gray-600"
            } text-xs font-bold uppercase`}
          >
            {t("player.your_answer")}
          </span>
          <div
            className={`text-2xl font-black ${
              gradingStatus === true
                ? "text-green-900"
                : gradingStatus === false
                ? "text-red-900"
                : "text-gray-900"
            } mt-1`}
          >
            {formatUserAnswer(lastAnswer)}
          </div>
        </div>
      </div>
      <QuestionSource source={source} />
    </div>
  );
};

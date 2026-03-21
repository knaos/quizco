import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChronologyAnswer, ChronologyContent, ChronologyItem } from "@quizco/shared";
import { buildChronologyOrderForGrading } from "./chronologyBoard";

interface ChronologyRevealProps {
  content: ChronologyContent;
  lastAnswer: ChronologyAnswer | null;
}

/**
 * Reveal component for CHRONOLOGY questions.
 * Shows items in submitted order with correctness indicators.
 * Green = correct position, Red = incorrect position (shows correct position).
 */
export const ChronologyReveal: React.FC<ChronologyRevealProps> = ({
  content,
  lastAnswer,
}) => {
  const { t } = useTranslation();

  if (!lastAnswer) {
    return (
      <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200">
        <p className="text-gray-500 text-center font-medium">
          {t("player.no_answer_submitted")}
        </p>
      </div>
    );
  }

  // Map submitted answer to items with their correctness
  const submittedItems = buildChronologyOrderForGrading(lastAnswer)
    .map((id) => content.items.find((item) => item.id === id))
    .filter(Boolean) as ChronologyItem[];

  return (
    <div className="space-y-3">
      {submittedItems.map((item, index) => {
        const isCorrectPosition = item.order === index;

        let containerClass =
          "flex items-center space-x-4 p-5 border-2 rounded-2xl transition-all ";
        if (isCorrectPosition) {
          containerClass += "border-green-500 bg-green-50 shadow-md";
        } else {
          containerClass += "border-red-500 bg-red-50";
        }

        return (
          <div key={item.id} className={containerClass}>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                isCorrectPosition
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`flex-1 text-xl font-bold ${
                isCorrectPosition ? "text-green-900" : "text-red-900"
              }`}
            >
              {item.text}
            </span>
            {isCorrectPosition ? (
              <CheckCircle className="text-green-600 w-8 h-8" />
            ) : (
              <div className="text-right">
                <XCircle className="text-red-600 w-8 h-8" />
                <span className="text-xs font-medium text-red-700">
                  {t("player.should_be")} #{item.order + 1}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

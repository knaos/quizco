import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MultipleChoiceQuestion, MultipleChoiceContent } from "@quizco/shared";

interface MultipleChoiceRevealProps {
  question: MultipleChoiceQuestion;
  lastAnswer: number[] | null;
  teamName: string;
}

/**
 * Reveal component for MULTIPLE_CHOICE questions.
 * Displays options with color coding:
 * - Green: correct option
 * - Red: selected but incorrect
 * - Gray: not selected
 */
export const MultipleChoiceReveal: React.FC<MultipleChoiceRevealProps> = ({
  question,
  lastAnswer,
  teamName,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-4">
      {question.content.options.map((opt: string, i: number) => {
        const isOptionCorrect = question.content.correctIndices.includes(i);
        const isSelected = Array.isArray(lastAnswer) && lastAnswer.includes(i);

        let containerClass = "p-6 rounded-2xl border-2 transition-all flex items-center justify-between ";
        if (isOptionCorrect) {
          containerClass += "border-green-500 bg-green-50 shadow-md scale-[1.02]";
        } else if (isSelected && !isOptionCorrect) {
          containerClass += "border-red-500 bg-red-50 opacity-80";
        } else {
          containerClass += "border-gray-100 bg-gray-50 opacity-40";
        }

        return (
          <div key={i} className={containerClass}>
            <span
              className={`text-xl font-bold ${
                isOptionCorrect
                  ? "text-green-800"
                  : isSelected
                  ? "text-red-800"
                  : "text-gray-500"
              }`}
            >
              {opt}
            </span>
            <div className="flex items-center space-x-3">
              {isSelected && (
                <span
                  className={`text-xs font-black uppercase px-2 py-1 rounded ${
                    isOptionCorrect
                      ? "bg-green-200 text-green-800"
                      : "bg-red-200 text-red-800"
                  }`}
                >
                  {t("player.your_choice")}
                </span>
              )}
              {isOptionCorrect && <CheckCircle className="text-green-600 w-8 h-8" />}
              {isSelected && !isOptionCorrect && (
                <XCircle className="text-red-600 w-8 h-8" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

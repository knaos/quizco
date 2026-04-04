import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { MultipleChoiceQuestion } from "@quizco/shared";

interface MultipleChoiceRevealProps {
  question: MultipleChoiceQuestion;
  lastAnswer: number[] | null;
}

/**
 * Reveal component for MULTIPLE_CHOICE questions.
 * Displays options with color coding to match the active phase styling:
 * - Green: correct option
 * - Red: selected but incorrect
 * - Gray: not selected (dimmed)
 */
export const MultipleChoiceReveal: React.FC<MultipleChoiceRevealProps> = ({
  question,
  lastAnswer,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {question.content.options.map((opt: string, i: number) => {
        const isOptionCorrect = question.content.correctIndices.includes(i);
        const isSelected = Array.isArray(lastAnswer) && lastAnswer.includes(i);

        // Match active phase styling: border-4, p-6, rounded-2xl, text-xl, font-black
        // Add visual prominence for correct answers (translate-y, shadow)
        let containerClass = "border-4 p-6 rounded-2xl text-xl font-black transition-all transform flex items-center justify-between ";
        if (isOptionCorrect) {
          containerClass += "border-green-400 bg-green-50 shadow-lg translate-y-[-2px]";
        } else if (isSelected && !isOptionCorrect) {
          containerClass += "border-red-500 bg-red-50 opacity-90";
        } else {
          containerClass += "border-gray-100 bg-gray-50 text-gray-400 opacity-50";
        }

        return (
          <div key={i} className={containerClass}>
            <span
              className={`${isOptionCorrect
                  ? "text-green-800"
                  : isSelected
                    ? "text-red-800"
                    : "text-gray-500"
                }`}
            >
              {opt}
            </span>
            <div className="flex items-center space-x-3">
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

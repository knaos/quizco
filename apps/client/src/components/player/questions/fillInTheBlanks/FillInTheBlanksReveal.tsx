import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FillInTheBlanksContent } from "@quizco/shared";
import { QuestionSource } from "../../QuestionSource";

interface FillInTheBlanksRevealProps {
  content: FillInTheBlanksContent;
  lastAnswer: string[] | null;
  source?: string | null;
}

/**
 * Reveal component for FILL_IN_THE_BLANKS questions.
 * Shows the text with blanks, comparing user answers vs correct answers.
 * Green = correct, Red = incorrect, Gray = no answer.
 */
export const FillInTheBlanksReveal: React.FC<FillInTheBlanksRevealProps> = ({
  content,
  lastAnswer,
  source,
}) => {
  const { t } = useTranslation();

  // Parse the question text to extract parts and blanks
  const parts = content.text.split(/(\{?\d+\}?)/g);

  return (
    <div className="space-y-6">
      {/* Main text with filled blanks */}
      <div className="bg-white p-4 rounded-3xl shadow-xl border-b-8 border-blue-500 text-left leading-loose text-2xl font-medium text-gray-800">
        {parts.map((part, i) => {
          const match = part.match(/\{?(\d+)\}?/);
          if (match) {
            const index = parseInt(match[1]);
            const blankConfig = content.blanks[index];
            if (!blankConfig)
              return <span key={i} className="text-red-500">[{part}]</span>;

            // Get user's answer for this blank
            const userAnswer =
              lastAnswer && lastAnswer[index] ? lastAnswer[index] : null;
            // Get the correct answer
            const correctOption = blankConfig.options.find((o) => o.isCorrect);
            const correctAnswer = correctOption ? correctOption.value : "??";
            const isCorrect = userAnswer === correctAnswer;

            let containerClass =
              "inline-flex items-center mx-2 px-4 py-2 border-b-4 rounded-lg transition-all ";
            if (isCorrect) {
              containerClass += "bg-green-50 border-green-500 text-green-900";
            } else if (userAnswer) {
              containerClass += "bg-red-50 border-red-500 text-red-900";
            } else {
              containerClass += "bg-gray-50 border-gray-300 text-gray-400";
            }

            return (
              <span key={i} className={containerClass}>
                <span className="mr-2">
                  {userAnswer || t('player.no_answer')}
                </span>
                {isCorrect ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : userAnswer ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : null}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>

      {/* Show correct answers summary */}
      <div className="p-6 bg-gray-50 rounded-2xl">
        <p className="text-sm font-bold text-gray-600 mb-3">
          {t("player.correct_answer")}:
        </p>
        <div className="flex flex-wrap gap-3">
          {content.blanks.map((blank, idx) => {
            const correctOption = blank.options.find((o) => o.isCorrect);
            return (
              <span
                key={idx}
                className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-lg font-bold"
              >
                #{idx + 1}: {correctOption?.value || "??"}
              </span>
            );
          })}
        </div>
      </div>
      <QuestionSource source={source} />
    </div>
  );
};

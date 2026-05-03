import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TrueFalseRevealProps } from '@quizco/shared';
import { Check, X } from 'lucide-react';
import { QuestionSource } from "../../QuestionSource";

interface TrueFalseRevealWithSourceProps extends TrueFalseRevealProps {
  source?: string | null;
}

export const TrueFalseReveal: React.FC<TrueFalseRevealWithSourceProps> = ({
  content,
  lastAnswer,
  variant = "player",
  source,
}) => {
  const { t } = useTranslation();

  const correctAnswer = content.isTrue;
  const playerAnswer = lastAnswer;

  if (variant === "host") {
    return (
      <div className="space-y-4">
        <div className={`aspect-square md:aspect-auto md:h-24 rounded-3xl text-4xl font-black uppercase flex items-center justify-center w-full shadow-2xl border-b-8 ${content.isTrue
          ? "bg-green-600 text-white border-green-800"
          : "bg-red-500 text-white border-red-700"
          }`}>
          {content.isTrue ? t("game.true") : t("game.false")}
        </div>
        {content.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800">
            <span className="text-base font-bold uppercase text-blue-600 block mb-1">
              {t("game.explanation")}
            </span>
            <p className="text-lg">{content.explanation}</p>
          </div>
        )}
        <QuestionSource source={source} />
      </div>
    );
  }

  const isPlayerCorrect = playerAnswer !== null && playerAnswer === correctAnswer;

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className={`aspect-square md:aspect-auto md:h-24 rounded-3xl text-4xl font-black uppercase flex items-center justify-center w-full shadow-2xl border-b-8 ${correctAnswer === true
            ? isPlayerCorrect
              ? "bg-green-600 text-white border-green-800"
              : "bg-green-500 text-white border-green-700"
            : "bg-gray-200 text-gray-400 border-gray-300 grayscale"
            }`}>
            {correctAnswer === true && playerAnswer === true && <Check className='mr-2' strokeWidth={5} size={36} />}
            {correctAnswer === false && playerAnswer === true && <X className='mr-2' strokeWidth={5} size={36} />}
            {t("game.true")}
          </div>
          <span className={`text-lg font-bold uppercase ${correctAnswer === true ? "text-green-600" : "text-red-500"
            }`}>
            {correctAnswer === true
              ? t("player.correct_answer")
              : isPlayerCorrect
                ? ""
                : playerAnswer === true
                  ? t("player.your_answer")
                  : ""}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className={`aspect-square md:aspect-auto md:h-24 rounded-3xl text-4xl font-black uppercase flex items-center justify-center w-full shadow-2xl border-b-8 ${correctAnswer === false
            ? isPlayerCorrect
              ? "bg-red-600 text-white border-red-800"
              : "bg-red-500 text-white border-red-700"
            : "bg-gray-200 text-gray-400 border-gray-300 grayscale"
            }`}>
            {correctAnswer === false && playerAnswer === false && <Check className='mr-2' strokeWidth={5} size={36} />}
            {correctAnswer === true && playerAnswer === false && <X className='mr-2' strokeWidth={5} size={36} />}
            {t("game.false")}
          </div>
          <span className={`text-lg font-bold uppercase ${correctAnswer === false ? "text-green-600" : "text-red-500"
            }`}>
            {correctAnswer === false
              ? t("player.correct_answer")
              : isPlayerCorrect
                ? ""
                : playerAnswer === false
                  ? t("player.your_answer")
                  : ""}
          </span>
        </div>
      </div>
      {content.explanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800">
          <span className="text-base font-bold uppercase text-blue-600 block mb-1">
            {t("game.explanation")}
          </span>
          <p className="text-lg">{content.explanation}</p>
        </div>
      )}
      <QuestionSource source={source} />
    </div>
  );
};

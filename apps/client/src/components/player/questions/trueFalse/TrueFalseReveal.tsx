import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TrueFalseContent } from '@quizco/shared';
import { Check, X } from 'lucide-react';

interface TrueFalseRevealProps {
  content: TrueFalseContent;
  lastAnswer: boolean | null;
  variant?: "player" | "audience" | "host";
}

export const TrueFalseReveal: React.FC<TrueFalseRevealProps> = ({
  content,
  lastAnswer,
  variant = "player",
}) => {
  const { t } = useTranslation();

  const correctAnswer = content.isTrue;
  const playerAnswer = lastAnswer;

  if (variant === "host") {
    return (
      <div className={`aspect-square md:aspect-auto md:h-24 rounded-3xl text-4xl font-black uppercase flex items-center justify-center w-full shadow-2xl border-b-8 ${content.isTrue
        ? "bg-green-600 text-white border-green-800"
        : "bg-red-500 text-white border-red-700"
        }`}>
        {content.isTrue ? t("game.true") : t("game.false")}
      </div>
    );
  }

  const isPlayerCorrect = playerAnswer !== null && playerAnswer === correctAnswer;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl mx-auto">
      <div className="flex flex-col items-center gap-3">
        <div className={`aspect-square md:aspect-auto md:h-24 rounded-3xl text-4xl font-black uppercase flex items-center justify-center w-full shadow-2xl border-b-8 ${correctAnswer === true
          ? isPlayerCorrect
            ? "bg-green-600 text-white border-green-800"
            : "bg-green-500 text-white border-green-700"
          : "bg-gray-200 text-gray-400 border-gray-300 grayscale"
          }`}>
          {correctAnswer === true && isPlayerCorrect && <Check className='mr-2' strokeWidth={5} size={36} />}
          {correctAnswer === false && !isPlayerCorrect && <X className='mr-2' strokeWidth={5} size={36} />}
          {t("game.true")}
        </div>
        <span className={`text-md font-bold uppercase ${correctAnswer === true ? "text-green-600" : "text-red-500"
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
          {correctAnswer === false && isPlayerCorrect && <Check className='mr-2' strokeWidth={5} size={36} />}
          {correctAnswer === true && !isPlayerCorrect && <X className='mr-2' strokeWidth={5} size={36} />}
          {t("game.false")}
        </div>
        <span className={`text-md font-bold uppercase ${correctAnswer === false ? "text-green-600" : "text-red-500"
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
  );
};

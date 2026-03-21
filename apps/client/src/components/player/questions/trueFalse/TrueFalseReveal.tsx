import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react';
import type { TrueFalseContent } from '@quizco/shared';

interface TrueFalseRevealProps {
  content: TrueFalseContent;
  lastAnswer: boolean | null;
}

export const TrueFalseReveal: React.FC<TrueFalseRevealProps> = ({
  content,
  lastAnswer,
}) => {
  const { t } = useTranslation();

  const isAnswerCorrect = lastAnswer === content.isTrue;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className={`${isAnswerCorrect ? "bg-green-50 border-green-200" : lastAnswer !== null ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"} p-6 rounded-2xl border-2`}>
        <span className={`${isAnswerCorrect ? "text-green-600" : lastAnswer !== null ? "text-red-600" : "text-gray-600"} text-xs font-bold uppercase`}>{t('player.your_answer')}</span>
        <div className={`text-2xl font-black ${isAnswerCorrect ? "text-green-900" : lastAnswer !== null ? "text-red-900" : "text-gray-900"} mt-1 flex items-center justify-between`}>
          <span>
            {lastAnswer === null ? t("player.no_answer_submitted") : (lastAnswer ? t("game.true") : t("game.false"))}
          </span>
          {isAnswerCorrect ? (
            <CheckCircle className="text-green-600 w-8 h-8 ml-2" />
          ) : lastAnswer !== null ? (
            <XCircle className="text-red-600 w-8 h-8 ml-2" />
          ) : null}
        </div>
      </div>
      <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-200">
        <span className="text-green-600 text-xs font-bold uppercase">{t('player.correct_answer')}</span>
        <p className="text-2xl font-black text-green-900 mt-1">
          {content.isTrue ? t("game.true") : t("game.false")}
        </p>
      </div>
    </div>
  );
};

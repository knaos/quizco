import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react';
import type { CorrectTheErrorContent } from '@quizco/shared';

interface CorrectTheErrorRevealProps {
  content: CorrectTheErrorContent;
  lastAnswer: { selectedPhraseIndex: number; correction: string } | null;
}

export const CorrectTheErrorReveal: React.FC<CorrectTheErrorRevealProps> = ({
  content,
  lastAnswer,
}) => {
  const { t } = useTranslation();

  const getCorrectAnswer = () => {
    const errorPhrase = content.phrases[content.errorPhraseIndex];
    const errorText = typeof errorPhrase === 'object' ? errorPhrase.text : errorPhrase;
    return `${errorText} → ${content.correctReplacement}`;
  };

  const getUserAnswer = () => {
    if (!lastAnswer || lastAnswer.selectedPhraseIndex === -1) return t("player.no_answer_submitted");
    const selectedPhrase = content.phrases[lastAnswer.selectedPhraseIndex];
    const phraseText = selectedPhrase ? (typeof selectedPhrase === 'object' ? selectedPhrase.text : selectedPhrase) : `Phrase ${lastAnswer.selectedPhraseIndex + 1}`;
    return `${phraseText} → ${lastAnswer.correction || "???"}`;
  };

  const isAnswerCorrect = lastAnswer && 
    lastAnswer.selectedPhraseIndex === content.errorPhraseIndex && 
    lastAnswer.correction === content.correctReplacement;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-200">
        <span className="text-green-600 text-xs font-bold uppercase">{t('player.correct_answer')}</span>
        <p className="text-2xl font-black text-green-900 mt-1">{getCorrectAnswer()}</p>
      </div>
      <div className={`${isAnswerCorrect ? "bg-green-50 border-green-200" : lastAnswer ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"} p-6 rounded-2xl border-2`}>
        <span className={`${isAnswerCorrect ? "text-green-600" : lastAnswer ? "text-red-600" : "text-gray-600"} text-xs font-bold uppercase`}>{t('player.your_answer')}</span>
        <div className={`text-2xl font-black ${isAnswerCorrect ? "text-green-900" : lastAnswer ? "text-red-900" : "text-gray-900"} mt-1 flex items-center justify-between`}>
          <span>{getUserAnswer()}</span>
          {isAnswerCorrect ? (
            <CheckCircle className="text-green-600 w-8 h-8 ml-2" />
          ) : lastAnswer ? (
            <XCircle className="text-red-600 w-8 h-8 ml-2" />
          ) : null}
        </div>
      </div>
    </div>
  );
};

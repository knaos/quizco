import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react';
import type { CorrectTheErrorAnswer, CorrectTheErrorContent } from '@quizco/shared';

interface CorrectTheErrorRevealProps {
  content: CorrectTheErrorContent;
  lastAnswer: CorrectTheErrorAnswer | null;
}

/**
 * Reveal component for CORRECT_THE_ERROR questions.
 * Displays phrases and alternatives with color coding:
 * - Green: correct phrase/alternative
 * - Red: selected but incorrect
 * - Gray: not selected
 */
export const CorrectTheErrorReveal: React.FC<CorrectTheErrorRevealProps> = ({
  content,
  lastAnswer,
}) => {
  const { t } = useTranslation();

  // Always show alternatives for the correct phrase (the one with the error)
  // This way, if player chose wrong phrase, they see what alternatives were available for the correct phrase
  const selectedPhrase = content.phrases[content.errorPhraseIndex];

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl border-4 border-indigo-100">
        <h3 className="text-2xl font-bold mb-8 text-center text-indigo-900">
          {t('player.questions.correctTheError.instruction')}
        </h3>

        {/* Phrase buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {content.phrases.map((phrase, index) => {
            const isCorrectPhrase = index === content.errorPhraseIndex;
            const isSelectedPhrase = lastAnswer && lastAnswer.selectedPhraseIndex === index;
            
            let btnClass = "px-6 py-4 rounded-xl text-xl font-medium transition-all duration-200 border-2 ";
            
            if (isCorrectPhrase) {
              // This is the correct phrase - always show green
              btnClass += 'bg-green-500 text-white border-green-600 shadow-lg';
            } else if (isSelectedPhrase) {
              // User selected wrong phrase - show red
              btnClass += 'bg-red-500 text-white border-red-600 shadow-lg';
            } else {
              // Not selected and not correct - neutral gray
              btnClass += 'bg-gray-100 text-gray-600 border-gray-200 opacity-50';
            }

            return (
              <div key={index} className="relative">
                <button
                  disabled
                  className={btnClass}
                >
                  {phrase.text}
                </button>
                {/* Show indicator icon */}
                {isCorrectPhrase && (
                  <CheckCircle className="absolute -top-3 -right-3 text-green-600 w-6 h-6 bg-white rounded-full shadow" />
                )}
                {isSelectedPhrase && !isCorrectPhrase && (
                  <XCircle className="absolute -top-3 -right-3 text-red-600 w-6 h-6 bg-white rounded-full shadow" />
                )}
              </div>
            );
          })}
        </div>

        {/* Alternatives for selected phrase */}
        {selectedPhrase && (
          <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-200">
            <p className="text-center text-lg font-semibold text-indigo-900 mb-4">
              {t('player.questions.correctTheError.selectCorrection')}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {selectedPhrase.alternatives.map((alt, aIdx) => {
                const isCorrectAlt = alt === content.correctReplacement;
                const isSelectedAlt = lastAnswer && lastAnswer.correction === alt;

                let altClass = "py-4 px-6 rounded-xl text-lg font-bold transition-all flex items-center justify-between ";
                
                if (isCorrectAlt) {
                  // This is the correct alternative - always show green
                  altClass += 'bg-green-500 text-white border-2 border-green-600 shadow-md';
                } else if (isSelectedAlt) {
                  // User selected wrong alternative - show red
                  altClass += 'bg-red-500 text-white border-2 border-red-600 shadow-md';
                } else {
                  // Not selected and not correct - neutral
                  altClass += 'bg-gray-200 text-gray-600 border-2 border-gray-300 opacity-50';
                }

                return (
                  <div key={aIdx} className={altClass}>
                    <span>{alt}</span>
                    <div className="flex items-center">
                      {isCorrectAlt && (
                        <CheckCircle className="text-white w-6 h-6" />
                      )}
                      {isSelectedAlt && !isCorrectAlt && (
                        <XCircle className="text-white w-6 h-6" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No answer submitted message */}
        {!lastAnswer && (
          <div className="text-center p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
            <p className="text-xl font-medium text-gray-500">
              {t("player.no_answer_submitted")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

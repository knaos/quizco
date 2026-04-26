import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react';
import type { CorrectTheErrorAnswer, CorrectTheErrorContent } from '@quizco/shared';

interface CorrectTheErrorRevealProps {
  content: CorrectTheErrorContent;
  lastAnswer: CorrectTheErrorAnswer | null;
  showSelectionLabels?: boolean;
}

/**
 * Reveal component for CORRECT_THE_ERROR questions.
 * Displays words and alternatives with color coding:
 * - Green: correct word/alternative
 * - Red: selected but incorrect
 * - Plain text: words without alternatives
 */
export const CorrectTheErrorReveal: React.FC<CorrectTheErrorRevealProps> = ({
  content,
  lastAnswer,
  showSelectionLabels = true,
}) => {
  const { t } = useTranslation();

  // Guard against empty content
  if (!content || !content.text) {
    return (
      <div className="text-center text-gray-500 p-4">
        {t('player.questions.correctTheError.noContent')}
      </div>
    );
  }

  // Parse the sentence into words
  const sentenceWords = content.text.trim().split(/\s+/);

  // Get word indices that have alternatives
  const wordsWithAlternatives = new Set(content.words.map(w => w.wordIndex));

  // Get the correct word (the one with the error)
  const correctWord = content.words.find(w => w.wordIndex === content.errorWordIndex);

  // Get alternatives for the correct word
  const correctWordAlternatives = correctWord?.alternatives || [];

  return (
    <div className="space-y-6">
      {/* Words with alternatives shown as buttons, rest as plain text */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xl mb-8">
        {sentenceWords.map((word, index) => {
          const isCorrectWord = index === content.errorWordIndex;
          const isSelectedWord = lastAnswer && lastAnswer.selectedWordIndex === index;
          const hasAlternatives = wordsWithAlternatives.has(index);

          if (!hasAlternatives) {
            // Render as plain text for words without alternatives
            return (
              <span
                key={index}
                className="px-1 py-2 text-gray-600 font-medium"
              >
                {word}
              </span>
            );
          }

          // Render as button for words with alternatives
          let btnClass = "px-4 py-3 rounded-xl font-medium transition-all duration-200 border-2 ";

          if (isCorrectWord) {
            // This is the correct word - always show green
            btnClass += 'bg-green-500 text-white border-green-600 shadow-lg';
          } else if (isSelectedWord) {
            // User selected wrong word - show red
            btnClass += 'bg-red-500 text-white border-red-600 shadow-lg';
          } else {
            // Has alternatives but not selected - show as available
            btnClass += 'bg-gray-100 text-gray-600 border-gray-300 opacity-60';
          }

          return (
            <div key={index} className="relative">
              <button
                disabled
                className={btnClass}
              >
                {word}
              </button>
              {/* Show indicator icon for correct/incorrect selection */}
              {isCorrectWord && (
                <CheckCircle className="absolute -top-3 -right-3 text-green-600 w-6 h-6 bg-white rounded-full shadow" />
              )}
              {isSelectedWord && !isCorrectWord && (
                <XCircle className="absolute -top-3 -right-3 text-red-600 w-6 h-6 bg-white rounded-full shadow" />
              )}
              {showSelectionLabels && isSelectedWord && !isCorrectWord && (
                <span className="absolute -top-3 -left-3 text-xs font-black uppercase px-2 py-1 rounded bg-red-200 text-red-800">
                  {t('player.your_choice')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Alternatives for the correct word */}
      {correctWordAlternatives.length > 0 && (
        <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-200">
          <p className="text-center text-lg font-semibold text-indigo-900 mb-4">
            {t('player.questions.correctTheError.selectCorrection')}
          </p>
          <div className="grid grid-cols-1 gap-3">
            {correctWordAlternatives.map((alt, aIdx) => {
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
                  <div className="flex items-center space-x-2">
                    {showSelectionLabels && isSelectedAlt && !isCorrectAlt && (
                      <span className="text-xs font-black uppercase px-2 py-1 rounded bg-red-200 text-red-800">
                        {t('player.your_choice')}
                      </span>
                    )}
                    {isCorrectAlt && (
                      <span className="text-xs font-black uppercase px-2 py-1 rounded bg-green-200 text-green-800">
                        {t('player.correct_answer')}
                      </span>
                    )}
                    {isCorrectAlt && (
                      <CheckCircle className="text-white w-6 h-6" />
                    )}
                    {showSelectionLabels && isSelectedAlt && !isCorrectAlt && (
                      <XCircle className="text-white w-6 h-6" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

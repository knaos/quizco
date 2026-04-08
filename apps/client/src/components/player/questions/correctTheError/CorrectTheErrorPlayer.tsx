import React from 'react';
import type { CorrectTheErrorContent, CorrectTheErrorAnswer } from '@quizco/shared';
import { useTranslation } from 'react-i18next';

interface CorrectTheErrorPlayerProps {
  content: CorrectTheErrorContent;
  value: CorrectTheErrorAnswer;
  onChange: (value: CorrectTheErrorAnswer) => void;
  disabled?: boolean;
  /** When true, shows word buttons but disables them and hides alternatives - used in QUESTION_PREVIEW phase */
  previewMode?: boolean;
}

const CorrectTheErrorPlayer: React.FC<CorrectTheErrorPlayerProps> = ({
  content,
  value,
  onChange,
  disabled,
  previewMode = false,
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

  const handleWordSelect = (wordIndex: number) => {
    if (disabled || previewMode) return;
    // Check if this word has alternatives
    if (!wordsWithAlternatives.has(wordIndex)) return;
    
    onChange({
      ...value,
      selectedWordIndex: wordIndex,
      // Clear correction when switching words to avoid confusion
      correction: wordIndex === value.selectedWordIndex ? value.correction : ''
    });
  };

  const handleCorrectionSelect = (correction: string) => {
    if (value.selectedWordIndex === -1 || disabled || previewMode) return;
    onChange({
      ...value,
      correction,
    });
  };

  // Get the alternatives for the currently selected word
  const getSelectedWordAlternatives = (): string[] => {
    const selectedWord = content.words.find(w => w.wordIndex === value.selectedWordIndex);
    return selectedWord?.alternatives || [];
  };

  return (
    <div className="space-y-6">
      {/* Display sentence with words that have alternatives as buttons, rest as plain text */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xl">
        {sentenceWords.map((word, index) => {
          const hasAlternatives = wordsWithAlternatives.has(index);
          const isSelected = value.selectedWordIndex === index;
          const isClickable = hasAlternatives && !disabled && !previewMode;
          
          if (hasAlternatives) {
            // Render as button
            return (
              <button
                key={index}
                disabled={!isClickable}
                onClick={() => handleWordSelect(index)}
                data-testid={`cte-word-${index}`}
                className={`
                  px-4 py-3 rounded-xl font-medium transition-all duration-200 border-2
                  ${isSelected
                    ? 'bg-red-500 text-white border-red-600 shadow-lg transform scale-105'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-red-400 hover:bg-red-50 cursor-pointer'
                  }
                  ${!isClickable ? 'opacity-70 cursor-not-allowed' : ''}
                `}
              >
                {word}
              </button>
            );
          } else {
            // Render as plain text
            return (
              <span
                key={index}
                className="px-1 py-2 text-gray-600 font-medium"
              >
                {word}
              </span>
            );
          }
        })}
      </div>

      {/* Show alternatives only when a word with alternatives is selected and NOT in preview mode */}
      {!previewMode && value.selectedWordIndex !== -1 && wordsWithAlternatives.has(value.selectedWordIndex) && (
        <div className="animate-fade-in bg-blue-50 p-6 rounded-2xl border-2 border-blue-200 mt-8">
          <p className="text-center text-lg font-semibold text-blue-900 mb-4">
            {t('player.questions.correctTheError.selectCorrection')}
          </p>
          <div className="grid grid-cols-1 gap-3">
            {getSelectedWordAlternatives().map((alt, aIdx) => (
              <button
                key={aIdx}
                disabled={disabled}
                onClick={() => handleCorrectionSelect(alt)}
                data-testid={`cte-alternative-${aIdx}`}
                className={`
                  py-4 px-6 rounded-xl text-lg font-bold transition-all
                  ${value.correction === alt
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-blue-700 border-2 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm'
                  }
                  ${disabled ? 'cursor-not-allowed' : 'active:scale-95'}
                `}
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrectTheErrorPlayer;

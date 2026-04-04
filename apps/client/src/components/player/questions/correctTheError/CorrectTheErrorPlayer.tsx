import React from 'react';
import type { CorrectTheErrorContent, CorrectTheErrorAnswer } from '@quizco/shared';
import { useTranslation } from 'react-i18next';

interface CorrectTheErrorPlayerProps {
  content: CorrectTheErrorContent;
  value: CorrectTheErrorAnswer;
  onChange: (value: CorrectTheErrorAnswer) => void;
  disabled?: boolean;
  /** When true, shows phrase buttons but disables them and hides alternatives - used in QUESTION_PREVIEW phase */
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

  const handlePhraseSelect = (index: number) => {
    if (disabled || previewMode) return;
    onChange({
      ...value,
      selectedPhraseIndex: index,
      // Clear correction when switching phrases to avoid confusion
      correction: index === value.selectedPhraseIndex ? value.correction : ''
    });
  };

  const handleCorrectionSelect = (correction: string) => {
    if (value.selectedPhraseIndex === -1 || disabled || previewMode) return;
    onChange({
      ...value,
      correction,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-4">
        {content.phrases.map((phrase, index) => (
          <button
            key={index}
            disabled={disabled || previewMode}
            onClick={() => handlePhraseSelect(index)}
            data-testid={`cte-phrase-${index}`}
            className={`px-6 py-4 rounded-xl text-xl font-medium transition-all duration-200 border-2 ${value.selectedPhraseIndex === index
              ? 'bg-red-500 text-white border-red-600 shadow-lg transform scale-105'
              : 'bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:bg-red-50'
              } ${(disabled || previewMode) && value.selectedPhraseIndex !== index ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {phrase.text}
          </button>
        ))}
      </div>

      {/* Only show alternatives when NOT in preview mode */}
      {!previewMode && value.selectedPhraseIndex !== -1 && (
        <div className="animate-fade-in bg-blue-50 p-6 rounded-2xl border-2 border-blue-200 mt-10">
          <p className="text-center text-lg font-semibold text-blue-900 mb-4">
            {t('player.questions.correctTheError.selectCorrection')}
          </p>
          <div className="grid grid-cols-1 gap-3">
            {content.phrases[value.selectedPhraseIndex].alternatives.map((alt, aIdx) => (
              <button
                key={aIdx}
                disabled={disabled}
                onClick={() => handleCorrectionSelect(alt)}
                data-testid={`cte-alternative-${aIdx}`}
                className={`py-4 px-6 rounded-xl text-lg font-bold transition-all ${value.correction === alt
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-blue-700 border-2 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm'
                  } ${disabled ? 'cursor-not-allowed' : 'active:scale-95'}`}
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

import React, { useState } from 'react';
import type { CorrectTheErrorContent, CorrectTheErrorAnswer } from '@quizco/shared';
import { useTranslation } from 'react-i18next';

interface CorrectTheErrorPlayerProps {
  content: CorrectTheErrorContent;
  onAnswer: (answer: CorrectTheErrorAnswer) => void;
  disabled?: boolean;
  initialAnswer?: CorrectTheErrorAnswer;
}

const CorrectTheErrorPlayer: React.FC<CorrectTheErrorPlayerProps> = ({
  content,
  onAnswer,
  disabled,
  initialAnswer,
}) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    initialAnswer?.selectedPhraseIndex ?? null
  );
  const [correction, setCorrection] = useState(initialAnswer?.correction || '');

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    onAnswer({
      selectedPhraseIndex: selectedIndex,
      correction,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold mb-4 text-center">
          {t('player.questions.correctTheError.instruction')}
        </h3>
        
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {content.phrases.map((phrase, index) => (
            <button
              key={index}
              disabled={disabled}
              onClick={() => setSelectedIndex(index)}
              className={`px-4 py-2 rounded-lg text-lg transition-all ${
                selectedIndex === index
                  ? 'bg-red-500 text-white shadow-md transform scale-105'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              } ${disabled && selectedIndex !== index ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {phrase}
            </button>
          ))}
        </div>

        {selectedIndex !== null && (
          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('player.questions.correctTheError.correctionLabel')}
            </label>
            <input
              type="text"
              value={correction}
              disabled={disabled}
              onChange={(e) => setCorrection(e.target.value)}
              className="w-full border-2 border-indigo-200 rounded-xl p-4 text-xl focus:border-indigo-500 focus:ring-0 transition-colors"
              placeholder={t('player.questions.correctTheError.correctionPlaceholder')}
            />
            
            {!disabled && (
              <button
                onClick={handleSubmit}
                className="mt-6 w-full bg-indigo-600 text-white py-4 rounded-xl text-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                {t('common.submit')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CorrectTheErrorPlayer;

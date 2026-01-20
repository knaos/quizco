import React, { useState, useEffect } from 'react';
import type { CorrectTheErrorContent } from '@quizco/shared';
import { useTranslation } from 'react-i18next';


interface CorrectTheErrorEditorProps {
  content: Partial<CorrectTheErrorContent>;
  onChange: (content: CorrectTheErrorContent) => void;
}

const CorrectTheErrorEditor: React.FC<CorrectTheErrorEditorProps> = ({ content, onChange }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(content.text || '');
  const [phrases, setPhrases] = useState<string[]>(content.phrases || []);
  const [errorPhraseIndex, setErrorPhraseIndex] = useState(content.errorPhraseIndex ?? -1);
  const [correctReplacement, setCorrectReplacement] = useState(content.correctReplacement || '');

  useEffect(() => {
    onChange({
      text,
      phrases,
      errorPhraseIndex,
      correctReplacement,
    });
  }, [text, phrases, errorPhraseIndex, correctReplacement]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    // Automatically split by space or common punctuation to suggest phrases
    // But we let the user refine it
    if (phrases.length === 0) {
        setPhrases(newText.split(/([,.\s]+)/).filter(p => p.trim().length > 0));
    }
  };

  const updatePhrase = (index: number, value: string) => {
    const newPhrases = [...phrases];
    newPhrases[index] = value;
    setPhrases(newPhrases);
  };

  const addPhrase = () => setPhrases([...phrases, '']);
  const removePhrase = (index: number) => {
    const newPhrases = phrases.filter((_, i) => i !== index);
    setPhrases(newPhrases);
    if (errorPhraseIndex === index) setErrorPhraseIndex(-1);
    else if (errorPhraseIndex > index) setErrorPhraseIndex(errorPhraseIndex - 1);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">{t('admin.questions.correctTheError.fullText')}</label>
        <textarea
          value={text}
          onChange={handleTextChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">{t('admin.questions.correctTheError.phrases')}</label>
        <p className="text-xs text-gray-500 mb-2">{t('admin.questions.correctTheError.phrasesHelp')}</p>
        <div className="space-y-2">
          {phrases.map((phrase, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="radio"
                name="errorPhrase"
                checked={errorPhraseIndex === index}
                onChange={() => setErrorPhraseIndex(index)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={phrase}
                onChange={(e) => updatePhrase(index, e.target.value)}
                className={`flex-1 border rounded-md p-2 ${errorPhraseIndex === index ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              <button
                onClick={() => removePhrase(index)}
                className="text-red-600 hover:text-red-800"
              >
                {t('common.remove')}
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addPhrase}
          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
          {t('admin.questions.correctTheError.addPhrase')}
        </button>
      </div>

      {errorPhraseIndex !== -1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('admin.questions.correctTheError.correctReplacement')}</label>
          <input
            type="text"
            value={correctReplacement}
            onChange={(e) => setCorrectReplacement(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder={t('admin.questions.correctTheError.correctReplacementPlaceholder')}
          />
        </div>
      )}
    </div>
  );
};

export default CorrectTheErrorEditor;

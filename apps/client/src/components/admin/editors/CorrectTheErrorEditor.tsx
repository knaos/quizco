import React, { useState, useEffect } from 'react';
import type { CorrectTheErrorContent, CorrectTheErrorPhrase } from '@quizco/shared';
import { useTranslation } from 'react-i18next';
import Button from '../../ui/Button';
import Input, { TextArea } from '../../ui/Input';
import { Card } from '../../ui/Card';


interface CorrectTheErrorEditorProps {
  content: Partial<CorrectTheErrorContent>;
  onChange: (content: CorrectTheErrorContent) => void;
}

const CorrectTheErrorEditor: React.FC<CorrectTheErrorEditorProps> = ({ content, onChange }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(content.text || '');
  const [phrases, setPhrases] = useState<CorrectTheErrorPhrase[]>(content.phrases || []);
  const [errorPhraseIndex, setErrorPhraseIndex] = useState(content.errorPhraseIndex ?? -1);
  const [correctReplacement, setCorrectReplacement] = useState(content.correctReplacement || '');

  useEffect(() => {
    onChange({
      text,
      phrases,
      errorPhraseIndex,
      correctReplacement,
    });
  }, [text, phrases, errorPhraseIndex, correctReplacement, onChange]);

  const updatePhraseText = (index: number, value: string) => {
    const newPhrases = [...phrases];
    newPhrases[index] = { ...newPhrases[index], text: value };
    setPhrases(newPhrases);
  };

  const updateAlternative = (phraseIndex: number, altIndex: number, value: string) => {
    const newPhrases = [...phrases];
    const newAlternatives = [...newPhrases[phraseIndex].alternatives];
    newAlternatives[altIndex] = value;
    newPhrases[phraseIndex] = { ...newPhrases[phraseIndex], alternatives: newAlternatives };
    setPhrases(newPhrases);
    
    // If this phrase is the error and this alternative was the correct replacement, update it
    if (phraseIndex === errorPhraseIndex && correctReplacement === phrases[phraseIndex].alternatives[altIndex]) {
        setCorrectReplacement(value);
    }
  };

  const addPhrase = () => {
    if (phrases.length >= 4) return;
    setPhrases([...phrases, { text: '', alternatives: ['', '', ''] }]);
  };

  const removePhrase = (index: number) => {
    const newPhrases = phrases.filter((_, i) => i !== index);
    setPhrases(newPhrases);
    if (errorPhraseIndex === index) {
      setErrorPhraseIndex(-1);
      setCorrectReplacement('');
    } else if (errorPhraseIndex > index) {
      setErrorPhraseIndex(errorPhraseIndex - 1);
    }
  };

  return (
    <div className="space-y-6">
      <TextArea
        label={t('admin.questions.correctTheError.fullText')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={t('admin.questions.correctTheError.fullTextPlaceholder')}
      />

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider ml-1">
            {t('admin.questions.correctTheError.phrases')} (1-4)
          </label>
          <Button
            onClick={addPhrase}
            disabled={phrases.length >= 4}
            size="sm"
            variant="purple"
          >
            {t('admin.questions.correctTheError.addPhrase')}
          </Button>
        </div>

        {phrases.map((phrase, pIdx) => (
          <Card key={pIdx} variant="flat" className={`p-4 space-y-3 ${errorPhraseIndex === pIdx ? 'border-red-500 bg-red-50' : ''}`}>
            <div className="flex items-start space-x-3">
              <div className="flex items-center h-10">
                <input
                  type="radio"
                  name="errorPhrase"
                  checked={errorPhraseIndex === pIdx}
                  onChange={() => {
                    setErrorPhraseIndex(pIdx);
                    setCorrectReplacement('');
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  title={t('admin.questions.correctTheError.markAsError')}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="text"
                  value={phrase.text}
                  onChange={(e) => updatePhraseText(pIdx, e.target.value)}
                  placeholder={t('admin.questions.correctTheError.phraseTextPlaceholder')}
                  className="py-2 text-base"
                />
              </div>
              <Button
                variant="ghost"
                onClick={() => removePhrase(pIdx)}
                className="text-red-600 h-10 px-2"
              >
                {t('common.remove')}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-7">
              {phrase.alternatives.map((alt, aIdx) => (
                <div key={aIdx} className="relative">
                  <Input
                    type="text"
                    value={alt}
                    onChange={(e) => updateAlternative(pIdx, aIdx, e.target.value)}
                    placeholder={`${t('admin.questions.correctTheError.alternative')} ${aIdx + 1}`}
                    className={`py-2 text-sm pr-8 ${
                      errorPhraseIndex === pIdx && correctReplacement === alt && alt !== ''
                        ? 'border-green-500 bg-green-50'
                        : ''
                    }`}
                  />
                  {errorPhraseIndex === pIdx && (
                    <button
                      type="button"
                      onClick={() => setCorrectReplacement(alt)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full ${
                        correctReplacement === alt && alt !== ''
                          ? 'text-green-600 bg-green-100'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={t('admin.questions.correctTheError.markAsCorrectReplacement')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CorrectTheErrorEditor;

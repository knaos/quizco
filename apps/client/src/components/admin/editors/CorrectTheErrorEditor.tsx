import React, { useState, useEffect } from 'react';
import type { CorrectTheErrorContent, CorrectTheErrorWord } from '@quizco/shared';
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
  const [words, setWords] = useState<CorrectTheErrorWord[]>(content.words || []);
  const [errorWordIndex, setErrorWordIndex] = useState(content.errorWordIndex ?? -1);
  const [correctReplacement, setCorrectReplacement] = useState(content.correctReplacement || '');

  useEffect(() => {
    onChange({
      text,
      words,
      errorWordIndex,
      correctReplacement,
    });
  }, [text, words, errorWordIndex, correctReplacement, onChange]);

  const updateWordText = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = { ...newWords[index], text: value };
    setWords(newWords);
  };

  const updateAlternative = (wordIndex: number, altIndex: number, value: string) => {
    const newWords = [...words];
    const newAlternatives = [...newWords[wordIndex].alternatives];
    newAlternatives[altIndex] = value;
    newWords[wordIndex] = { ...newWords[wordIndex], alternatives: newAlternatives };
    setWords(newWords);
    
    // If this word is the error and this alternative was the correct replacement, update it
    if (words[wordIndex].wordIndex === errorWordIndex && correctReplacement === words[wordIndex].alternatives[altIndex]) {
        setCorrectReplacement(value);
    }
  };

  const addWord = () => {
    // Find the next available word index based on existing words
    const usedIndices = new Set(words.map(w => w.wordIndex));
    let nextIndex = 0;
    while (usedIndices.has(nextIndex)) {
      nextIndex++;
    }
    
    setWords([...words, { wordIndex: nextIndex, text: '', alternatives: ['', '', ''] }]);
  };

  const removeWord = (index: number) => {
    const newWords = words.filter((_, i) => i !== index);
    setWords(newWords);
    if (errorWordIndex === words[index].wordIndex) {
      setErrorWordIndex(-1);
      setCorrectReplacement('');
    }
  };

  // Get the original sentence words for display
  const getSentenceWords = (): string[] => {
    if (!text.trim()) return [];
    return text.trim().split(/\s+/);
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

      {/* Show sentence preview with word indices */}
      {text.trim() && (
        <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
          <p className="text-sm font-bold text-blue-700 mb-2">
            {t('admin.questions.correctTheError.sentencePreview')}
          </p>
          <div className="flex flex-wrap gap-2">
            {getSentenceWords().map((word, idx) => {
              const hasAlternatives = words.some(w => w.wordIndex === idx);
              const isError = errorWordIndex === idx;
              return (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    isError
                      ? 'bg-red-500 text-white'
                      : hasAlternatives
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                  title={`Word ${idx}`}
                >
                  {idx}:{word}
                </span>
              );
            })}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            {t('admin.questions.correctTheError.legend')}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider ml-1">
            {t('admin.questions.correctTheError.wordsWithAlternatives')} (0-{getSentenceWords().length || '?'})
          </label>
          <Button
            onClick={addWord}
            disabled={!text.trim() || words.length >= (getSentenceWords().length || 0)}
            size="sm"
            variant="purple"
          >
            {t('admin.questions.correctTheError.addWord')}
          </Button>
        </div>

        {words.length === 0 && text.trim() && (
          <p className="text-sm text-gray-500 italic text-center py-4">
            {t('admin.questions.correctTheError.noWordsYet')}
          </p>
        )}

        {words.length === 0 && !text.trim() && (
          <p className="text-sm text-gray-500 italic text-center py-4">
            {t('admin.questions.correctTheError.enterSentenceFirst')}
          </p>
        )}

        {words.map((word, wIdx) => (
          <Card key={wIdx} variant="flat" className={`p-4 space-y-3 ${errorWordIndex === word.wordIndex ? 'border-red-500 bg-red-50' : ''}`}>
            <div className="flex items-start space-x-3">
              <div className="flex items-center h-10">
                <input
                  type="radio"
                  name="errorWord"
                  checked={errorWordIndex === word.wordIndex}
                  onChange={() => {
                    setErrorWordIndex(word.wordIndex);
                    setCorrectReplacement('');
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  title={t('admin.questions.correctTheError.markAsError')}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    #{word.wordIndex}
                  </span>
                  <Input
                    type="text"
                    value={word.text}
                    onChange={(e) => updateWordText(wIdx, e.target.value)}
                    placeholder={t('admin.questions.correctTheError.wordTextPlaceholder')}
                    className="py-2 text-base flex-1"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => removeWord(wIdx)}
                className="text-red-600 h-10 px-2"
              >
                {t('common.remove')}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-7">
              {word.alternatives.map((alt, aIdx) => (
                <div key={aIdx} className="relative">
                  <Input
                    type="text"
                    value={alt}
                    onChange={(e) => updateAlternative(wIdx, aIdx, e.target.value)}
                    placeholder={`${t('admin.questions.correctTheError.alternative')} ${aIdx + 1}`}
                    className={`py-2 text-sm pr-8 ${
                      errorWordIndex === word.wordIndex && correctReplacement === alt && alt !== ''
                        ? 'border-green-500 bg-green-50'
                        : ''
                    }`}
                  />
                  {errorWordIndex === word.wordIndex && (
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

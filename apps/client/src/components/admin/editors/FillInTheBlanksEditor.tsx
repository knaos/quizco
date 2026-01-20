import React from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import type { FillInTheBlanksContent } from "@quizco/shared";

interface FillInTheBlanksEditorProps {
  content: FillInTheBlanksContent;
  onChange: (content: FillInTheBlanksContent) => void;
}

export const FillInTheBlanksEditor: React.FC<FillInTheBlanksEditorProps> = ({
  content,
  onChange,
}) => {
  const updateText = (text: string) => {
    const placeholderCount = (text.match(/\{(\d+)\}/g) || []).length;
    const newBlanks = [...(content.blanks || [])];

    if (newBlanks.length < placeholderCount) {
      for (let i = newBlanks.length; i < placeholderCount; i++) {
        newBlanks.push({ options: [{ value: "", isCorrect: true }] });
      }
    } else if (newBlanks.length > placeholderCount) {
      newBlanks.splice(placeholderCount);
    }

    onChange({
      ...content,
      text,
      blanks: newBlanks,
    });
  };

  const addOption = (blankIndex: number) => {
    const newBlanks = [...content.blanks];
    newBlanks[blankIndex].options.push({ value: "", isCorrect: false });
    onChange({ ...content, blanks: newBlanks });
  };

  const removeOption = (blankIndex: number, optionIndex: number) => {
    const newBlanks = [...content.blanks];
    const blank = newBlanks[blankIndex];
    if (blank.options.length <= 1) return;

    const wasCorrect = blank.options[optionIndex].isCorrect;
    blank.options = blank.options.filter((_, i) => i !== optionIndex);
    
    if (wasCorrect && blank.options.length > 0) {
      blank.options[0].isCorrect = true;
    }
    
    onChange({ ...content, blanks: newBlanks });
  };

  const updateOption = (blankIndex: number, optionIndex: number, value: string) => {
    const newBlanks = [...content.blanks];
    newBlanks[blankIndex].options[optionIndex].value = value;
    onChange({ ...content, blanks: newBlanks });
  };

  const setCorrect = (blankIndex: number, optionIndex: number) => {
    const newBlanks = [...content.blanks];
    newBlanks[blankIndex].options.forEach((opt, i) => {
      opt.isCorrect = i === optionIndex;
    });
    onChange({ ...content, blanks: newBlanks });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Text with placeholders (e.g., "The {0} is {1}.")
        </label>
        <textarea
          value={content.text}
          onChange={(e) => updateText(e.target.value)}
          className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
          rows={3}
        />
      </div>

      <div className="space-y-6">
        <label className="block text-sm font-medium text-gray-700">
          Blanks Configuration
        </label>
        {content.blanks.map((blank, bIdx) => (
          <div key={bIdx} className="space-y-3 p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-blue-600 font-black text-lg">{`Placeholder {${bIdx}}`}</span>
              <span className="text-xs font-bold uppercase text-gray-400">Options for this blank</span>
            </div>
            
            <div className="space-y-2">
              {blank.options.map((option, oIdx) => (
                <div key={oIdx} className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setCorrect(bIdx, oIdx)}
                    className={`transition-colors ${option.isCorrect ? 'text-green-500' : 'text-gray-300 hover:text-green-200'}`}
                  >
                    {option.isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  <input
                    type="text"
                    value={option.value}
                    onChange={(e) => updateOption(bIdx, oIdx, e.target.value)}
                    className="flex-1 p-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none font-medium"
                    placeholder={`Option ${oIdx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(bIdx, oIdx)}
                    disabled={blank.options.length <= 1}
                    className="p-2 text-gray-300 hover:text-red-500 disabled:opacity-0 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addOption(bIdx)}
              className="text-blue-600 font-bold flex items-center hover:underline text-sm mt-2"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Option
            </button>
          </div>
        ))}

        {content.blanks.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            Add placeholders like {"{0}"} in the text above to configure options.
          </p>
        )}
      </div>
    </div>
  );
};

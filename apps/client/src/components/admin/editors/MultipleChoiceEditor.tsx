import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { MultipleChoiceContent } from "@quizco/shared";

interface MultipleChoiceEditorProps {
  content: MultipleChoiceContent;
  onChange: (content: MultipleChoiceContent) => void;
}

export const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
  content,
  onChange,
}) => {
  const addOption = () => {
    onChange({ ...content, options: [...content.options, ""] });
  };

  const removeOption = (index: number) => {
    const newOptions = content.options.filter((_, i) => i !== index);
    onChange({
      ...content,
      options: newOptions,
      correctIndex: content.correctIndex >= newOptions.length ? 0 : content.correctIndex,
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...content.options];
    newOptions[index] = value;
    onChange({ ...content, options: newOptions });
  };

  return (
    <div className="space-y-4">
      {content.options.map((opt, i) => (
        <div key={i} className="flex items-center space-x-3">
          <input
            type="radio"
            name="correctIndex"
            checked={content.correctIndex === i}
            onChange={() => onChange({ ...content, correctIndex: i })}
            className="w-5 h-5 text-blue-600"
          />
          <input
            type="text"
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            className="flex-1 p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
            placeholder={`Option ${i + 1}`}
          />
          <button
            onClick={() => removeOption(i)}
            className="p-2 text-gray-400 hover:text-red-500 transition"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ))}
      <button
        onClick={addOption}
        className="text-blue-600 font-bold flex items-center hover:underline"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Option
      </button>
    </div>
  );
};

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { MultipleChoiceContent } from "@quizco/shared";
import Button from "../../ui/Button";
import Input from "../../ui/Input";

interface MultipleChoiceEditorProps {
  content: MultipleChoiceContent;
  onChange: (content: MultipleChoiceContent) => void;
}

export const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
  content,
  onChange,
}) => {
  const addOption = () => {
    onChange({ 
        ...content, 
        options: [...content.options, ""],
        correctIndices: content.correctIndices || [] 
    });
  };

  const removeOption = (index: number) => {
    const newOptions = content.options.filter((_, i) => i !== index);
    const newCorrectIndices = (content.correctIndices || [])
        .filter(i => i !== index)
        .map(i => i > index ? i - 1 : i);

    onChange({
      ...content,
      options: newOptions,
      correctIndices: newCorrectIndices,
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...content.options];
    newOptions[index] = value;
    onChange({ ...content, options: newOptions });
  };

  const toggleCorrect = (index: number) => {
    const current = content.correctIndices || [];
    const next = current.includes(index)
        ? current.filter(i => i !== index)
        : [...current, index];
    onChange({ ...content, correctIndices: next });
  };

  return (
    <div className="space-y-4">
      {content.options.map((opt, i) => (
        <div key={i} className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={(content.correctIndices || []).includes(i)}
            onChange={() => toggleCorrect(i)}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <Input
            type="text"
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
          />
          <Button
            variant="ghost"
            onClick={() => removeOption(i)}
            className="p-2"
          >
            <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-500" />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        onClick={addOption}
        className="text-blue-600 p-0 hover:bg-transparent hover:underline"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Option
      </Button>
    </div>
  );
};

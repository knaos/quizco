import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { MatchingContent, MatchingPair } from "@quizco/shared";
import { v4 as uuidv4 } from "uuid";
import Button from "../../ui/Button";
import Input from "../../ui/Input";

interface MatchingEditorProps {
  content: MatchingContent;
  onChange: (content: MatchingContent) => void;
}

export const MatchingEditor: React.FC<MatchingEditorProps> = ({
  content,
  onChange,
}) => {
  const addPair = () => {
    const newPair: MatchingPair = {
      id: uuidv4(),
      left: "",
      right: "",
    };
    onChange({
      ...content,
      pairs: [...(content.pairs || []), newPair],
    });
  };

  const removePair = (id: string) => {
    onChange({
      ...content,
      pairs: content.pairs.filter((p) => p.id !== id),
    });
  };

  const updatePair = (id: string, field: "left" | "right", value: string) => {
    onChange({
      ...content,
      pairs: content.pairs.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-2">
        <label className="text-sm font-medium text-gray-700">Left Side</label>
        <label className="text-sm font-medium text-gray-700">Right Side (Correct Match)</label>
      </div>
      
      {content.pairs.map((pair) => (
        <div key={pair.id} className="flex items-center space-x-3">
          <Input
            type="text"
            value={pair.left}
            onChange={(e) => updatePair(pair.id, "left", e.target.value)}
            placeholder="Left item"
          />
          <span className="text-gray-400">↔</span>
          <Input
            type="text"
            value={pair.right}
            onChange={(e) => updatePair(pair.id, "right", e.target.value)}
            placeholder="Right item"
          />
          <Button
            variant="ghost"
            onClick={() => removePair(pair.id)}
            className="p-2"
          >
            <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-500" />
          </Button>
        </div>
      ))}

      <Button
        variant="ghost"
        onClick={addPair}
        className="text-blue-600 p-0 hover:bg-transparent hover:underline"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Pair
      </Button>
    </div>
  );
};

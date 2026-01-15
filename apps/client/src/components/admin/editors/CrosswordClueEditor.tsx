import React from "react";
import { Trash2 } from "lucide-react";
import type { CrosswordClue } from "@quizco/shared";

interface CrosswordClueEditorProps {
  clues: CrosswordClue[];
  direction: "across" | "down";
  onAdd: () => void;
  onUpdate: (index: number, field: keyof CrosswordClue, value: any) => void;
  onRemove: (index: number) => void;
}

export const CrosswordClueEditor: React.FC<CrosswordClueEditorProps> = ({
  clues,
  direction,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-gray-700 uppercase text-xs">{direction}</h4>
        <button
          onClick={onAdd}
          className="text-xs text-blue-600 font-bold"
        >
          + Add Word
        </button>
      </div>
      <div className="space-y-3">
        {clues.map((clue, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                placeholder="X"
                value={clue.x}
                onChange={(e) => onUpdate(i, "x", parseInt(e.target.value))}
                className="p-1 text-xs border rounded"
              />
              <input
                type="number"
                placeholder="Y"
                value={clue.y}
                onChange={(e) => onUpdate(i, "y", parseInt(e.target.value))}
                className="p-1 text-xs border rounded"
              />
              <input
                type="number"
                placeholder="#"
                value={clue.number}
                onChange={(e) => onUpdate(i, "number", parseInt(e.target.value))}
                className="p-1 text-xs border rounded"
              />
              <button onClick={() => onRemove(i)} className="text-red-500 flex justify-end">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Word (Answer)"
              value={clue.answer}
              onChange={(e) => onUpdate(i, "answer", e.target.value)}
              className="w-full p-2 text-sm border rounded"
            />
            <input
              type="text"
              placeholder="Clue"
              value={clue.clue}
              onChange={(e) => onUpdate(i, "clue", e.target.value)}
              className="w-full p-2 text-sm border rounded"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

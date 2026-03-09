import React from "react";
import { Trash2 } from "lucide-react";
import type { CrosswordClue } from "@quizco/shared";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import { Card } from "../../ui/Card";

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
        <Button
          variant="ghost"
          onClick={onAdd}
          className="text-xs text-blue-600 p-0 hover:bg-transparent"
        >
          + Add Word
        </Button>
      </div>
      <div className="space-y-3">
        {clues.map((clue, i) => (
          <Card key={i} variant="flat" className="p-4 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <Input
                type="number"
                placeholder="X"
                value={clue.x}
                onChange={(e) => onUpdate(i, "x", parseInt(e.target.value))}
                className="p-1 text-xs h-8 py-0 px-2"
              />
              <Input
                type="number"
                placeholder="Y"
                value={clue.y}
                onChange={(e) => onUpdate(i, "y", parseInt(e.target.value))}
                className="p-1 text-xs h-8 py-0 px-2"
              />
              <Input
                type="number"
                placeholder="#"
                value={clue.number}
                onChange={(e) => onUpdate(i, "number", parseInt(e.target.value))}
                className="p-1 text-xs h-8 py-0 px-2"
              />
              <Button 
                variant="ghost" 
                onClick={() => onRemove(i)} 
                className="text-red-500 p-0 justify-end hover:bg-transparent"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Input
              type="text"
              placeholder="Word (Answer)"
              value={clue.answer}
              onChange={(e) => onUpdate(i, "answer", e.target.value)}
              className="py-1 px-3 text-sm h-9"
            />
            <Input
              type="text"
              placeholder="Clue"
              value={clue.clue}
              onChange={(e) => onUpdate(i, "clue", e.target.value)}
              className="py-1 px-3 text-sm h-9"
            />
          </Card>
        ))}
      </div>
    </div>
  );
};

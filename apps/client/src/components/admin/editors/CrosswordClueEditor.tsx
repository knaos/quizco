import React from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CrosswordClue } from "@quizco/shared";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import { Card } from "../../ui/Card";

interface CrosswordClueEditorProps {
  clues: CrosswordClue[];
  direction: "across" | "down";
  onAdd: () => void;
  onUpdate: (index: number, field: keyof CrosswordClue, value: CrosswordClue[keyof CrosswordClue]) => void;
  onRemove: (index: number) => void;
}

export const CrosswordClueEditor: React.FC<CrosswordClueEditorProps> = ({
  clues,
  direction,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-gray-700 uppercase text-xs">{direction}</h4>
        <Button
          variant="ghost"
          onClick={onAdd}
          className="text-xs text-blue-600 p-0 hover:bg-transparent"
        >
          + {t("admin.editors.crossword.clueEditor.add_word")}
        </Button>
      </div>
      <div className="space-y-3">
        {clues.map((clue, i) => (
          <Card key={i} variant="flat" className="p-4 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <Input
                type="number"
                placeholder={t("admin.editors.crossword.clueEditor.x_label")}
                value={clue.x}
                onChange={(e) => onUpdate(i, "x", parseInt(e.target.value))}
                className="p-1 text-xs h-8 py-0 px-2"
              />
              <Input
                type="number"
                placeholder={t("admin.editors.crossword.clueEditor.y_label")}
                value={clue.y}
                onChange={(e) => onUpdate(i, "y", parseInt(e.target.value))}
                className="p-1 text-xs h-8 py-0 px-2"
              />
              <Input
                type="number"
                placeholder={t("admin.editors.crossword.clueEditor.number_label")}
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
              placeholder={t("admin.editors.crossword.clueEditor.answer_placeholder")}
              value={clue.answer}
              onChange={(e) => onUpdate(i, "answer", e.target.value)}
              className="py-1 px-3 text-sm h-9"
            />
            <Input
              type="text"
              placeholder={t("admin.editors.crossword.clueEditor.clue_placeholder")}
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

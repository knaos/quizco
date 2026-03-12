import React, { useMemo } from "react";
import type { CrosswordClue, CrosswordContent } from "@quizco/shared";
import { CrosswordPlayer } from "../../player/CrosswordPlayer";
import { CrosswordClueEditor } from "./CrosswordClueEditor";
import { Card } from "../../ui/Card";

interface CrosswordEditorProps {
  content: CrosswordContent;
  onChange: (content: CrosswordContent) => void;
}

export const CrosswordEditor: React.FC<CrosswordEditorProps> = ({
  content,
  onChange,
}) => {
  // Helper to generate grid from clues
  const crosswordData = useMemo(() => {
    if (!content.clues) return null;
    
    const { across = [], down = [] } = content.clues;
    
    // Find max dimensions
    let maxR = 1;
    let maxC = 1;
    
    ([...across, ...down] as CrosswordClue[]).forEach(clue => {
      const r = clue.y;
      const c = clue.x;
      const len = clue.answer.length;
      if (clue.direction === "across") {
        maxR = Math.max(maxR, r + 1);
        maxC = Math.max(maxC, c + len);
      } else {
        maxR = Math.max(maxR, r + len);
        maxC = Math.max(maxC, c + 1);
      }
    });

    // Create empty grid
    const grid = Array.from({ length: maxR }, () => Array(maxC).fill(""));

    // Fill grid
    (across as CrosswordClue[]).forEach(clue => {
      for (let i = 0; i < clue.answer.length; i++) {
        if (grid[clue.y] && grid[clue.y][clue.x + i] !== undefined) {
          grid[clue.y][clue.x + i] = clue.answer[i].toUpperCase();
        }
      }
    });
    (down as CrosswordClue[]).forEach(clue => {
      for (let i = 0; i < clue.answer.length; i++) {
        if (grid[clue.y + i] && grid[clue.y + i][clue.x] !== undefined) {
          grid[clue.y + i][clue.x] = clue.answer[i].toUpperCase();
        }
      }
    });

    return { grid, clues: content.clues };
  }, [content.clues]);
  const previewKey = useMemo(() => JSON.stringify(crosswordData?.clues ?? {}), [crosswordData]);

  const addClue = (direction: "across" | "down") => {
    const newClues = { ...content.clues };
    const newClue: CrosswordClue = {
      number: (newClues.across.length + newClues.down.length) + 1,
      x: 0,
      y: 0,
      direction,
      clue: "",
      answer: ""
    };
    newClues[direction] = [...newClues[direction], newClue];
    onChange({ ...content, clues: newClues });
  };

  const updateClue = (
    direction: "across" | "down",
    index: number,
    field: keyof CrosswordClue,
    value: CrosswordClue[keyof CrosswordClue]
  ) => {
    const newClues = { ...content.clues };
    const directionClues = [...newClues[direction]];
    directionClues[index] = { ...directionClues[index], [field]: value };
    newClues[direction] = directionClues;
    onChange({ ...content, clues: newClues });
  };

  const removeClue = (direction: "across" | "down", index: number) => {
    const newClues = { ...content.clues };
    newClues[direction] = newClues[direction].filter((_, i) => i !== index);
    onChange({ ...content, clues: newClues });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <CrosswordClueEditor
          direction="across"
          clues={content.clues.across}
          onAdd={() => addClue("across")}
          onUpdate={(i, f, v) => updateClue("across", i, f, v)}
          onRemove={(i) => removeClue("across", i)}
        />
        <CrosswordClueEditor
          direction="down"
          clues={content.clues.down}
          onAdd={() => addClue("down")}
          onUpdate={(i, f, v) => updateClue("down", i, f, v)}
          onRemove={(i) => removeClue("down", i)}
        />
      </div>
      <Card variant="flat" className="p-4 flex flex-col items-center justify-center min-h-[300px]">
        <span className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Live Preview</span>
        <div className="w-full h-full max-h-[400px] overflow-auto">
          {crosswordData && crosswordData.grid.length > 0 && crosswordData.grid[0].length > 0 ? (
            <CrosswordPlayer key={previewKey} data={crosswordData} />
          ) : (
            <p className="text-gray-400 italic text-sm">Add clues to see preview</p>
          )}
        </div>
      </Card>
    </div>
  );
};

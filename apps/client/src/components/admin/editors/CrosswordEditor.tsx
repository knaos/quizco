import React, { useMemo, useState, useEffect } from "react";
import type { CrosswordClue } from "@quizco/shared";
import { Crossword } from "../../Crossword";
import { CrosswordClueEditor } from "./CrosswordClueEditor";

interface CrosswordEditorProps {
  content: {
    clues: {
      across: CrosswordClue[];
      down: CrosswordClue[];
    };
  };
  onChange: (content: any) => void;
}

export const CrosswordEditor: React.FC<CrosswordEditorProps> = ({
  content,
  onChange,
}) => {
  const [previewKey, setPreviewKey] = useState(0);

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

  useEffect(() => {
    setPreviewKey(k => k + 1);
  }, [crosswordData]);

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

  const updateClue = (direction: "across" | "down", index: number, field: keyof CrosswordClue, value: any) => {
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
      <div className="bg-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[300px]">
        <span className="text-xs font-bold text-gray-400 uppercase mb-4">Live Preview</span>
        <div className="w-full h-full max-h-[400px] overflow-auto">
          {crosswordData && crosswordData.grid.length > 0 && crosswordData.grid[0].length > 0 ? (
            <Crossword key={previewKey} data={crosswordData} onCrosswordCorrect={() => {}} />
          ) : (
            <p className="text-gray-400 italic text-sm">Add clues to see preview</p>
          )}
        </div>
      </div>
    </div>
  );
};

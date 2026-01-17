import React, { useState } from "react";
import type { CrosswordContent } from "@quizco/shared";

interface CrosswordProps {
  data: CrosswordContent;
  onCrosswordCorrect?: (isCorrect: boolean) => void;
}

export const Crossword: React.FC<CrosswordProps> = ({ data, onCrosswordCorrect }) => {
  const [userGrid, setUserGrid] = useState(
    data.grid ? data.grid.map((row) => row.map(() => "")) : []
  );

  const handleChange = (r: number, c: number, val: string) => {
    const newGrid = [...userGrid];
    newGrid[r][c] = val.toUpperCase().substring(0, 1);
    setUserGrid(newGrid);

    // Simple check
    let allCorrect = true;
    for (let i = 0; i < data.grid.length; i++) {
      for (let j = 0; j < data.grid[i].length; j++) {
        if (data.grid[i][j] !== "" && newGrid[i][j] !== data.grid[i][j]) {
          allCorrect = false;
        }
      }
    }
    if (allCorrect && onCrosswordCorrect) {
      onCrosswordCorrect(true);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <div className="grid gap-1 bg-gray-300 p-1 rounded shadow-lg" 
           style={{ gridTemplateColumns: `repeat(${data.grid?.[0]?.length || 0}, minmax(0, 1fr))` }}>
        {userGrid.map((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} className="w-10 h-10 md:w-12 md:h-12 bg-white flex items-center justify-center relative">
               {data.grid[r][c] === "" ? (
                 <div className="w-full h-full bg-gray-800" />
               ) : (
                 <input
                   type="text"
                   value={cell}
                   onChange={(e) => handleChange(r, c, e.target.value)}
                   className="w-full h-full text-center text-xl font-bold uppercase outline-none focus:bg-yellow-100"
                 />
               )}
            </div>
          ))
        )}
      </div>
      
      <div className="flex-1 space-y-4 text-left">
        <div>
          <h3 className="font-bold text-lg border-b mb-2">Across</h3>
          <ul className="space-y-1">
            {data.clues?.across?.map((clue, i) => (
              <li key={i}><span className="font-bold">{clue.number}.</span> {clue.clue}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-lg border-b mb-2">Down</h3>
          <ul className="space-y-1">
            {data.clues?.down?.map((clue, i) => (
              <li key={i}><span className="font-bold">{clue.number}.</span> {clue.clue}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { CrosswordContent, CrosswordClue } from "@quizco/shared";
import { socket } from "../../socket";
import { useTranslation } from "react-i18next";
import { useGame } from "../../contexts/game-context";

interface CrosswordPlayerProps {
  data: CrosswordContent;
  value?: string[][];
  onChange?: (grid: string[][]) => void;
  onSubmit?: (grid: string[][]) => void;
  onProgress?: (grid: string[][]) => void;
}

/**
 * Calculate cell numbers based on clue starting positions.
 * Numbers are assigned based on sorted unique starting coordinates (top-to-bottom, left-to-right).
 * If 2 clues start on the same cell, they will have the same number.
 */
const calculateCellNumbers = (clues: CrosswordContent['clues']): Map<string, number> => {
  const cellToNumber = new Map<string, number>();

  if (!clues) return cellToNumber;

  const allClues: CrosswordClue[] = [...(clues.across || []), ...(clues.down || [])];

  // Get unique starting positions and sort them (top-to-bottom, left-to-right)
  const uniqueStarts = new Map<string, CrosswordClue[]>();
  allClues.forEach(clue => {
    const key = `${clue.y}-${clue.x}`;
    if (!uniqueStarts.has(key)) {
      uniqueStarts.set(key, []);
    }
    uniqueStarts.get(key)!.push(clue);
  });

  const uniqueCoordsArray = Array.from(uniqueStarts.keys());
  uniqueCoordsArray.forEach(key => {
    const clue: CrosswordClue[] = uniqueStarts.get(key)!;
    cellToNumber.set(key, clue[0].number)
  })

  return cellToNumber;
};

export const CrosswordPlayer: React.FC<CrosswordPlayerProps> = ({
  data,
  value,
  onChange,
  onSubmit,
  onProgress,
}) => {
  const { t } = useTranslation();
  const { state } = useGame();

  // Calculate cell numbers from clue starting positions
  const cellNumbers = useMemo(() => calculateCellNumbers(data.clues), [data.clues]);

  // Initialize empty grid matching the data grid dimensions
  const initializeGrid = useCallback(() => {
    if (!data.grid) return [];
    return data.grid.map((row) => row.map(() => ""));
  }, [data.grid]);

  // Use external value if provided, otherwise use internal state
  const [internalGrid, setInternalGrid] = useState<string[][]>(() => initializeGrid());

  const hasValidInternalGridShape =
    internalGrid.length === data.grid.length &&
    internalGrid.every(
      (row, rowIndex) => row.length === (data.grid[rowIndex]?.length ?? 0),
    );

  // Use provided value or internal state. If the grid shape changed in uncontrolled mode,
  // fallback to a fresh grid without setting state inside an effect.
  const userGrid =
    value ?? (hasValidInternalGridShape ? internalGrid : initializeGrid());

  const handleChange = (r: number, c: number, val: string) => {
    const newGrid = [...userGrid.map((row) => [...row])];
    newGrid[r][c] = val.toUpperCase().substring(0, 1);

    // If external onChange is provided, use it; otherwise update internal state
    if (onChange) {
      onChange(newGrid);
    } else {
      setInternalGrid(newGrid);
    }

    if (onProgress) {
      onProgress(newGrid);
    }
  };

  useEffect(() => {
    const handleJoker = (payload: {
      x: number;
      y: number;
      letter: string;
      teamId: string;
    }) => {
      const teamId = localStorage.getItem("quizco_team_id");
      if (payload.teamId === teamId) {
        const newGrid = [...userGrid.map((row) => [...row])];
        newGrid[payload.y][payload.x] = payload.letter.toUpperCase();

        if (onChange) {
          onChange(newGrid);
        } else {
          setInternalGrid(newGrid);
        }
      }
    };

    socket.on("JOKER_REVEAL", handleJoker);
    return () => {
      socket.off("JOKER_REVEAL", handleJoker);
    };
  }, [userGrid, onChange]);

  const handleRequestJoker = () => {
    const teamId = localStorage.getItem("quizco_team_id");
    const competitionId = localStorage.getItem("quizco_selected_competition_id");
    if (teamId && competitionId && state.currentQuestion) {
      socket.emit("REQUEST_JOKER", {
        competitionId,
        teamId,
        questionId: state.currentQuestion.id,
      });
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(userGrid);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleRequestJoker}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg shadow transition flex items-center space-x-2"
        >
          <span className="text-xl">🃏</span>
          <span>
            {t("game.request_joker", "Request Joker")} (-2pts)
          </span>
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div
          className="grid gap-1 bg-gray-300 p-1 rounded shadow-lg"
          style={{
            gridTemplateColumns: `repeat(${data.grid?.[0]?.length || 0}, 48px)`,
          }}
        >
          {userGrid.map((row, r) =>
            row.map((cell, c) => {
              const cellNumber = cellNumbers.get(`${r}-${c}`);
              return (
                <div
                  key={`${r}-${c}`}
                  className="w-12 h-12 bg-white flex items-center justify-center rounded-sm relative"
                >
                  {data.grid[r][c].trim() === "" ? (
                    <div className="w-full h-full bg-gray-800 rounded-sm" />
                  ) : (
                    <>
                      {cellNumber && (
                        <span className="absolute top-0.5 left-1 text-[8px] md:text-[10px] font-bold text-blue-600 leading-none">
                          {cellNumber}
                        </span>
                      )}
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleChange(r, c, e.target.value)}
                        className="w-full h-full text-center text-xl font-bold uppercase outline-none focus:bg-yellow-100 rounded-sm"
                      />
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex-1 space-y-4 text-left">
          <div>
            <h3 className="font-bold text-lg border-b mb-2">Across</h3>
            <ul className="space-y-1">
              {data.clues?.across?.map((clue, i) => (
                <li key={i}>
                  <span className="font-bold">{clue.number}.</span> {clue.clue}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg border-b mb-2">Down</h3>
            <ul className="space-y-1">
              {data.clues?.down?.map((clue, i) => (
                <li key={i}>
                  <span className="font-bold">{clue.number}.</span> {clue.clue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-6">
        <button
          onClick={handleSubmit}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-2xl text-2xl flex items-center justify-center space-x-2 shadow-lg transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span>{t("player.submit_crossword", "Submit Crossword")}</span>
        </button>
      </div>
    </div>
  );
};

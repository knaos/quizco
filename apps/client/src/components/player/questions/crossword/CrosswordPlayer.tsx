import React, { useState, useCallback, useMemo, useRef } from "react";
import type { CrosswordContent, CrosswordClue } from "@quizco/shared";
import { useTranslation } from "react-i18next";
import { Send, ArrowBigRight, ArrowBigDown } from "lucide-react";
import { isStringGrid } from "../../../../utils/answerGuards";

interface CrosswordPlayerProps {
  data: CrosswordContent;
  value?: string[][];
  onChange?: (grid: string[][]) => void;
  onProgress?: (grid: string[][]) => void;
  /** When true, shows the crossword grid without input - used in QUESTION_PREVIEW */
  previewMode?: boolean;
  onSubmit?: (grid: string[][]) => void;
  readOnly?: boolean;
  testIdPrefix?: string;
  onRequestJoker?: (x: number, y: number) => void;
  requestJokerLabel?: string;
  submitLabel?: string;
  jokerUsed?: boolean;
  jokerCost?: number;
  revealedCells?: Set<string>;
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

/**
 * Get all cell coordinates that belong to a clue.
 * Returns an array of "row-col" strings for highlighting.
 */
const getCellsForClue = (clue: CrosswordClue): string[] => {
  const cells: string[] = [];

  for (let i = 0; i < clue.answer.length; i++) {
    const row = clue.direction === "across" ? clue.y : clue.y + i;
    const col = clue.direction === "across" ? clue.x + i : clue.x;
    cells.push(`${row}-${col}`);
  }

  return cells;
};

export const CrosswordPlayer: React.FC<CrosswordPlayerProps> = ({
  data,
  value,
  onChange,
  onProgress,
  previewMode = false,
  onSubmit,
  readOnly = false,
  testIdPrefix = "crossword",
  onRequestJoker,
  requestJokerLabel,
  submitLabel,
  jokerUsed = false,
  jokerCost = 2,
  revealedCells = new Set<string>(),
}) => {
  const [jokerSelectionMode, setJokerSelectionMode] = useState(false);
  const { t } = useTranslation();

  // Ref to store input elements for auto-focus
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Calculate cell numbers from clue starting positions
  const cellNumbers = useMemo(() => calculateCellNumbers(data.clues), [data.clues]);

  // Initialize empty grid matching the data grid dimensions
  const initializeGrid = useCallback(() => {
    if (!data.grid) return [];
    return data.grid.map((row) => row.map(() => ""));
  }, [data.grid]);

  const fallbackGrid = useMemo(() => initializeGrid(), [initializeGrid]);
  const controlledGrid = isStringGrid(value) ? value : undefined;

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
    controlledGrid ?? (hasValidInternalGridShape ? internalGrid : fallbackGrid);

  // State for highlighted cells when clicking on clues
  const [highlightedCells, setHighlightedCells] = useState<string[]>([]);
  const [selectedClueIndex, setSelectedClueIndex] = useState<number | null>(null);

  // State for active clue (used for direction-aware auto-advance)
  const [activeClue, setActiveClue] = useState<CrosswordClue | null>(null);
  const [activeClueCells, setActiveClueCells] = useState<string[]>([]);

  /**
   * Find the next cell within a clue's cells in the given direction.
   * Returns the next cell in the clue's sequence, skipping cells that already have letters.
   * If all cells after the current position are filled, wraps to find the first empty cell.
   * If all cells are filled, returns the first cell of the clue.
   */
  const findNextCellInClue = useCallback((
    currentR: number,
    currentC: number,
    clueCells: string[],
    grid: string[][]
  ): { r: number; c: number } | null => {
    // Find the index of the current cell in the clue cells array
    const currentKey = `${currentR}-${currentC}`;
    const currentIndex = clueCells.indexOf(currentKey);

    if (currentIndex === -1) {
      // Not in clue cells, return first cell
      const firstKey = clueCells[0];
      const [firstR, firstC] = firstKey.split('-').map(Number);
      return { r: firstR, c: firstC };
    }

    // Start searching from the next cell after current
    let searchIndex = currentIndex + 1;

    // First, try to find an empty cell after the current position
    while (searchIndex < clueCells.length) {
      const nextKey = clueCells[searchIndex];
      const [nextR, nextC] = nextKey.split('-').map(Number);

      // Check if this cell is empty
      if (!grid[nextR]?.[nextC] || grid[nextR][nextC] === "") {
        return { r: nextR, c: nextC };
      }
      searchIndex++;
    }

    // All cells after current are filled, wrap around to find first empty cell
    // Search from the beginning up to current position
    for (let i = 0; i <= currentIndex; i++) {
      const key = clueCells[i];
      const [r, c] = key.split('-').map(Number);

      // Check if this cell is empty
      if (!grid[r]?.[c] || grid[r][c] === "") {
        return { r, c };
      }
    }

    // All cells are filled, return null to keep focus on current cell
    return null;
  }, []);

  /**
   * Find the previous cell within a clue's cells.
   * Returns the previous cell in the clue's sequence.
   */
  const findPrevCellInClue = useCallback((
    currentR: number,
    currentC: number,
    clueCells: string[]
  ): { r: number; c: number } | null => {
    const currentKey = `${currentR}-${currentC}`;
    const currentIndex = clueCells.indexOf(currentKey);

    if (currentIndex <= 0) {
      return null;
    }

    const prevCellKey = clueCells[currentIndex - 1];
    const [prevR, prevC] = prevCellKey.split('-').map(Number);
    return { r: prevR, c: prevC };
  }, []);

  const handleChange = (r: number, c: number, val: string) => {
    const cellKey = `${c},${r}`;
    if (revealedCells.has(cellKey)) {
      return;
    }

    const newGrid = [...userGrid.map((row) => [...row])];
    const upperVal = val.toUpperCase();
    newGrid[r][c] = upperVal.substring(0, 1);

    // If external onChange is provided, use it; otherwise update internal state
    if (onChange) {
      onChange(newGrid);
    } else {
      setInternalGrid(newGrid);
    }

    if (onProgress) {
      onProgress(newGrid);
    }

    // Auto-focus next cell only when a clue is selected
    // When no clue is selected, typing does not auto-advance
    if (upperVal.length > 0 && activeClue && activeClueCells.length > 0) {
      // Pass newGrid to findNextCellInClue so it checks the updated grid state
      const nextCell = findNextCellInClue(r, c, activeClueCells, newGrid);

      if (nextCell) {
        const nextKey = `${nextCell.r}-${nextCell.c}`;
        const nextInput = inputRefs.current.get(nextKey);
        if (nextInput) {
          nextInput.focus();
        }
      }
      // If nextCell is null, we're at the end of the active clue - focus stays on current cell
    }
  };

  /**
   * Handle key down events for arrow key navigation and backspace.
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    // Handle arrow key navigation
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();

      let targetR = r;
      let targetC = c;

      if (e.key === "ArrowLeft") targetC = c - 1;
      else if (e.key === "ArrowRight") targetC = c + 1;
      else if (e.key === "ArrowUp") targetR = r - 1;
      else if (e.key === "ArrowDown") targetR = r + 1;

      // Find the next valid cell in the direction
      while (
        targetR >= 0 &&
        targetR < data.grid.length &&
        targetC >= 0 &&
        targetC < (data.grid[targetR]?.length ?? 0)
      ) {
        // Check if this is a valid cell (not a dark/empty cell in the grid)
        if (data.grid[targetR]?.[targetC]?.trim() !== "") {
          const targetKey = `${targetR}-${targetC}`;
          const targetInput = inputRefs.current.get(targetKey);
          if (targetInput) {
            // If there's an active clue and the target is outside its cells, deselect the clue
            if (activeClue && activeClueCells.length > 0 && !activeClueCells.includes(targetKey)) {
              setActiveClue(null);
              setActiveClueCells([]);
              setHighlightedCells([]);
              setSelectedClueIndex(null);
            }
            targetInput.focus();
            // Select the existing text for easy overwriting
            targetInput.select();
          }
          return;
        }
        // Move to next cell in same direction
        if (e.key === "ArrowLeft") targetC--;
        else if (e.key === "ArrowRight") targetC++;
        else if (e.key === "ArrowUp") targetR--;
        else if (e.key === "ArrowDown") targetR++;
      }
      return;
    }

    if (e.key === "Backspace") {
      const currentVal = userGrid[r]?.[c] || "";

      if (currentVal === "" && activeClue && activeClueCells.length > 0) {
        let prevCell: { r: number; c: number } | null = null;
        let currentR = r;
        let currentC = c;

        // Find previous non-revealed cell by traversing backwards through clue cells
        while (true) {
          const result = findPrevCellInClue(currentR, currentC, activeClueCells);
          if (!result) break;

          // Check if this cell is revealed by a joker
          const revealedKey = `${result.c},${result.r}`;
          if (revealedCells.has(revealedKey)) {
            // Skip this revealed cell and continue looking
            currentR = result.r;
            currentC = result.c;
            continue;
          }

          prevCell = result;
          break;
        }

        if (prevCell) {
          const newGrid = [...userGrid];
          newGrid[prevCell.r] = [...newGrid[prevCell.r]];
          newGrid[prevCell.r][prevCell.c] = "";

          if (onChange) {
            onChange(newGrid);
          } else {
            setInternalGrid(newGrid);
          }

          if (onProgress) {
            onProgress(newGrid);
          }

          const prevKey = `${prevCell.r}-${prevCell.c}`;
          const prevInput = inputRefs.current.get(prevKey);
          if (prevInput) {
            e.preventDefault();
            prevInput.focus();
          }
        }
      }
    }
  }, [userGrid, activeClue, activeClueCells, findPrevCellInClue, onChange, onProgress, data.grid, revealedCells]);

  const handleSubmit = () => {
    if (!readOnly && onSubmit) {
      onSubmit(userGrid);
    }
  };
  /**
   * Handle focus being placed on a cell manually (via click or tab).
   * If the cell is not in the active clue, clear the active clue state.
   * Uses ref to track if a clue switch is in progress to avoid clearing during transitions.
   */
  const clueSwitchInProgress = useRef(false);

  const handleCellFocus = useCallback((r: number, c: number) => {
    // Skip clearing if we're in the middle of switching clues
    if (clueSwitchInProgress.current) {
      return;
    }

    const cellKey = `${r}-${c}`;

    // If there's an active clue and the focused cell is not in it, clear the active clue
    if (activeClue && activeClueCells.length > 0) {
      if (!activeClueCells.includes(cellKey)) {
        setActiveClue(null);
        setActiveClueCells([]);
        setHighlightedCells([]);
        setSelectedClueIndex(null);
      }
    }
  }, [activeClue, activeClueCells]);

  // Handle click on a clue to highlight corresponding cells and set focus
  const handleClueClick = (clue: CrosswordClue, index: number) => {
    const cells = getCellsForClue(clue);

    // Toggle: if same clue clicked again, clear highlight and active clue
    if (selectedClueIndex === index) {
      setHighlightedCells([]);
      setSelectedClueIndex(null);
      setActiveClue(null);
      setActiveClueCells([]);
    } else {
      // Mark that we're switching clues to prevent handleCellFocus from clearing
      clueSwitchInProgress.current = true;

      setHighlightedCells(cells);
      setSelectedClueIndex(index);

      // Set the active clue for direction-aware navigation
      setActiveClue(clue);
      setActiveClueCells(cells);

      // Find the first empty cell in the clue to focus on
      // If all cells are filled, use the first cell
      let focusCellKey = cells[0];
      for (const cellKey of cells) {
        const [r, c] = cellKey.split('-').map(Number);
        if (!userGrid[r]?.[c] || userGrid[r][c] === "") {
          focusCellKey = cellKey;
          break;
        }
      }

      const firstInput = inputRefs.current.get(focusCellKey);
      if (firstInput) {
        firstInput.focus();
      }

      // Reset the flag after a short delay to allow focus event to complete
      setTimeout(() => {
        clueSwitchInProgress.current = false;
      }, 0);
    }
  };

  // In preview mode, hide joker and submit buttons
  if (previewMode) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div
            className="grid gap-1 bg-gray-300 p-1 rounded shadow-lg"
            style={{
              gridTemplateColumns: `repeat(${data.grid?.[0]?.length || 0}, 48px)`,
            }}
          >
            {data.grid.map((row, r) =>
              row.map((_, c) => {
                const cellNumber = cellNumbers.get(`${r}-${c}`);
                const cellKey = `${r}-${c}`;
                const isHighlighted = highlightedCells.includes(cellKey);
                const isEmpty = data.grid[r][c].trim() === "";
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`w-12 h-12 flex items-center justify-center rounded-sm relative ${isHighlighted ? "!bg-blue-200" : "bg-white"
                      }`}
                  >
                    {isEmpty ? (
                      <div className="w-full h-full bg-gray-800 rounded-sm" />
                    ) : (
                      <>
                        {cellNumber && (
                          <span className="absolute top-0.5 left-1 text-[12px] md:text-[12px] font-bold text-blue-600 leading-none">
                            {cellNumber}
                          </span>
                        )}
                        <div
                          data-testid={`crossword-cell-${r}-${c}`}
                          className={`w-full h-full flex items-center justify-center text-xl font-bold uppercase rounded-sm ${isHighlighted ? "!bg-blue-200" : "bg-transparent"
                            }`}
                        >
                          {userGrid[r]?.[c] || ""}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex-1 space-y-4 text-left">
            <div>
              <h3 className="font-bold text-lg bg-blue-600 text-white rounded-lg mb-2 p-2 inline-flex items-center gap-1">{t("host.across")} <ArrowBigRight className="fill-white w-5 h-5" /></h3>
              <ul className="space-y-1">
                {data.clues?.across?.map((clue, i) => (
                  <li
                    key={i}
                    className={`px-2 py-1 rounded ${selectedClueIndex === i ? "bg-blue-200 font-semibold" : ""
                      }`}
                  >
                    <span className="font-bold">{clue.number}.</span> {clue.clue}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg bg-blue-600 text-white rounded-lg mb-2 p-2 inline-flex items-center gap-1">{t("host.down")} <ArrowBigDown className="fill-white w-5 h-5" /></h3>
              <ul className="space-y-1">
                {data.clues?.down?.map((clue, i) => (
                  <li
                    key={i}
                    className={`px-2 py-1 rounded ${selectedClueIndex === i + (data.clues?.across?.length || 0) ? "bg-blue-200 font-semibold" : ""
                      }`}
                  >
                    <span className="font-bold">{clue.number}.</span> {clue.clue}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid={`${testIdPrefix}-crossword`}>
      {!readOnly && (
        <div className="flex justify-end items-center gap-2">
          {jokerSelectionMode && (
            <span className="text-yellow-700 font-medium">{t("game.joker_select_cell")}</span>
          )}
          <button
            onClick={() => {
              if (jokerUsed) return;
              if (jokerSelectionMode) {
                setJokerSelectionMode(false);
              } else {
                setJokerSelectionMode(true);
              }
            }}
            disabled={jokerUsed}
            className={`font-bold py-2 px-4 rounded-lg shadow transition flex items-center space-x-2 ${
              jokerUsed
                ? "bg-gray-400 cursor-not-allowed text-gray-600"
                : jokerSelectionMode
                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                : "bg-yellow-500 hover:bg-yellow-600 text-white"
            }`}
          >
            <span className="text-xl">🃏</span>
            <span>
              {jokerUsed
                ? t("game.joker_used")
                : jokerSelectionMode
                ? t("game.joker_cancel")
                : requestJokerLabel ?? t("game.request_joker")}
              {!jokerUsed && (jokerCost === 0 ? ` (${t("game.joker_free")})` : ` (-${t("game.joker_cost", { points: jokerCost })})`)}
            </span>
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div
          className="grid gap-1 bg-gray-300 p-1 rounded shadow-lg"
          style={{
            gridTemplateColumns: `repeat(${data.grid?.[0]?.length || 0}, 48px)`,
          }}
        >
          {data.grid.map((row, r) =>
            row.map((_, c) => {
              const cellNumber = cellNumbers.get(`${r}-${c}`);
              const cellKey = `${r}-${c}`;
              const isHighlighted = highlightedCells.includes(cellKey);
              const isEmpty = data.grid[r][c].trim() === "";
              const revealedCellKey = `${c},${r}`;
              const isRevealed = revealedCells.has(revealedCellKey);
              const isJokerSelectable = jokerSelectionMode && !isEmpty && !isRevealed;
              return (
                <div
                  key={`${r}-${c}`}
                  className={`w-12 h-12 flex items-center justify-center rounded-sm relative ${isHighlighted ? "!bg-blue-200" : "bg-white"
                    } ${isJokerSelectable ? "cursor-pointer hover:ring-2 hover:ring-yellow-400" : ""}`}
                  onClick={() => {
                    if (jokerSelectionMode && !isEmpty && !isRevealed) {
                      onRequestJoker?.(c, r);
                      setJokerSelectionMode(false);
                      return;
                    }
                    if (activeClue && !activeClueCells.includes(cellKey)) {
                      setActiveClue(null);
                      setActiveClueCells([]);
                      setHighlightedCells([]);
                      setSelectedClueIndex(null);
                    }
                  }}
                >
                  {isEmpty ? (
                    <div className="w-full h-full bg-gray-800 rounded-sm" />
                  ) : (
                    <>
                      {cellNumber && (
                        <span className="absolute top-0.5 left-1 text-[12px] md:text-[12px] font-bold text-blue-600 leading-none">
                          {cellNumber}
                        </span>
                      )}
                      {readOnly || isRevealed ? (
                        <span
                          data-testid={`${testIdPrefix}-crossword-cell-${r}-${c}`}
                          className={`w-full h-full flex items-center justify-center text-center text-xl font-bold uppercase rounded-sm ${isHighlighted ? "!bg-blue-200" : "bg-transparent"} ${isRevealed ? "text-green-600 font-bold" : ""}`}
                        >
                          {userGrid[r]?.[c] || ""}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={userGrid[r][c]}
                          onChange={(e) => handleChange(r, c, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, r, c)}
                          onFocus={() => handleCellFocus(r, c)}
                          onClick={() => handleCellFocus(r, c)}
                          data-testid={`crossword-cell-${r}-${c}`}
                          ref={(el) => {
                            if (el) {
                              inputRefs.current.set(`${r}-${c}`, el);
                            } else {
                              inputRefs.current.delete(`${r}-${c}`);
                            }
                          }}
                          className={`w-full h-full text-center text-xl font-bold uppercase outline-none focus:bg-yellow-100 rounded-sm ${isHighlighted ? "!bg-blue-200" : "bg-transparent"
                            }`}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex-1 space-y-4 text-left">
          <div>
            <h3 className="font-bold text-lg bg-blue-600 text-white rounded-lg mb-2 p-2 inline-flex items-center gap-1">{t("host.across")} <ArrowBigRight className="fill-white w-5 h-5" /></h3>
            <ul className="space-y-1">
              {data.clues?.across?.map((clue, i) => (
                <li
                  key={i}
                  onClick={() => handleClueClick(clue, i)}
                  data-testid={`${testIdPrefix}-crossword-across-${i}`}
                  className={`cursor-pointer px-2 py-1 rounded hover:bg-blue-100 transition ${selectedClueIndex === i ? "bg-blue-200 font-semibold" : ""
                    }`}
                >
                  <span className="font-bold">{clue.number}.</span> {clue.clue}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg bg-blue-600 text-white rounded-lg mb-2 p-2 inline-flex items-center gap-1">{t("host.down")} <ArrowBigDown className="fill-white w-5 h-5" /></h3>
            <ul className="space-y-1">
              {data.clues?.down?.map((clue, i) => (
                <li
                  key={i}
                  onClick={() => handleClueClick(clue, i + (data.clues?.across?.length || 0))}
                  data-testid={`${testIdPrefix}-crossword-down-${i}`}
                  className={`cursor-pointer px-2 py-1 rounded hover:bg-blue-100 transition ${selectedClueIndex === i + (data.clues?.across?.length || 0) ? "bg-blue-200 font-semibold" : ""
                    }`}
                >
                  <span className="font-bold">{clue.number}.</span> {clue.clue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            data-testid="crossword-submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl text-2xl flex items-center justify-center space-x-2 shadow-lg transition"
          >
            <Send className="w-8 h-8" />
            <span>{submitLabel ?? t("player.submit_crossword")}</span>
          </button>
        </div>
      )}
    </div>
  );
};

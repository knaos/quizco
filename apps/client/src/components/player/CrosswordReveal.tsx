import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CrosswordContent, CrosswordClue } from '@quizco/shared';

interface CrosswordRevealProps {
  content: CrosswordContent;
  lastAnswer: string[][] | null;
}

export const CrosswordReveal: React.FC<CrosswordRevealProps> = ({
  content,
  lastAnswer,
}) => {
  const { t } = useTranslation();

  const userGrid = lastAnswer;
  const correctGrid = content.grid;

  // If no answer submitted
  if (!userGrid || !Array.isArray(userGrid) || userGrid.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200">
        <p className="text-gray-500 text-center font-medium">{t("player.crossword_no_answer")}</p>
      </div>
    );
  }

  // Calculate cell numbers (same logic as CrosswordPlayer)
  const cellToNumber = new Map<string, number>();
  const allClues = [...(content.clues.across || []), ...(content.clues.down || [])];
  const uniqueStarts = new Map<string, CrosswordClue[]>();
  allClues.forEach(clue => {
    const key = `${clue.y}-${clue.x}`;
    if (!uniqueStarts.has(key)) {
      uniqueStarts.set(key, []);
    }
    uniqueStarts.get(key)!.push(clue);
  });
  uniqueStarts.forEach((clues, key) => {
    cellToNumber.set(key, clues[0].number);
  });

  // Check word correctness
  const checkWordCorrectness = (clue: CrosswordClue): boolean => {
    const userAnswer: string[] = [];

    let x = clue.x;
    let y = clue.y;

    for (let i = 0; i < clue.answer.length; i++) {
      if (y < userGrid.length && x < userGrid[y].length) {
        userAnswer.push(userGrid[y][x]?.toUpperCase() || "");
      }
      if (clue.direction === "across") {
        x++;
      } else {
        y++;
      }
    }

    return userAnswer.join("") === clue.answer.toUpperCase();
  };

  // Collect all clues with their correctness
  const acrossWords = content.clues.across.map(clue => ({
    ...clue,
    isCorrect: checkWordCorrectness(clue)
  }));
  const downWords = content.clues.down.map(clue => ({
    ...clue,
    isCorrect: checkWordCorrectness(clue)
  }));

  const totalWords = acrossWords.length + downWords.length;
  const correctWords = acrossWords.filter(w => w.isCorrect).length + downWords.filter(w => w.isCorrect).length;

  return (
    <div className="space-y-6">
      {/* Words counter */}
      <div className="text-center p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
        <p className="text-xl font-bold text-blue-800">
          {t("player.crossword_words_guessed", { correct: correctWords, total: totalWords })}
        </p>
      </div>

      {/* Side-by-side layout: Grid and Correct Answers */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: User's grid with color coding */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border-b-8 border-blue-500 flex-1 overflow-auto">
          <h3 className="text-lg font-bold text-gray-700 mb-4">{t("player.crossword_your_grid")}</h3>
          <div
            className="grid gap-1 bg-gray-300 p-1 rounded shadow-lg mx-auto"
            style={{
              gridTemplateColumns: `repeat(${correctGrid[0]?.length || 0}, 48px)`,
            }}
          >
            {userGrid.map((row, r) =>
              row.map((cell, c) => {
                const cellNumber = cellToNumber.get(`${r}-${c}`);
                const correctCell = correctGrid[r]?.[c]?.trim().toUpperCase() || "";
                const userCell = cell?.toUpperCase() || "";
                const isCorrectChar = correctCell !== "" && userCell === correctCell;
                const isWrongChar = correctCell !== "" && userCell !== "" && userCell !== correctCell;

                let cellClass = "w-12 h-12 flex items-center justify-center rounded-sm relative ";
                if (isCorrectChar) {
                  cellClass += "bg-green-500 text-white";
                } else if (isWrongChar) {
                  cellClass += "bg-red-500 text-white";
                } else if (correctCell === "") {
                  cellClass += "bg-gray-800";
                } else {
                  cellClass += "bg-white";
                }

                return (
                  <div key={`${r}-${c}`} className={cellClass}>
                    {correctCell !== "" && (
                      <>
                        {cellNumber && (
                          <span className="absolute top-0.5 left-1 text-[8px] md:text-[10px] font-bold text-blue-600 leading-none">
                            {cellNumber}
                          </span>
                        )}
                        <span className="text-xl font-bold uppercase">{userCell}</span>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Correct answers */}
        <div className="bg-gray-50 p-6 rounded-2xl flex-1">
          <p className="text-sm font-bold text-gray-600 mb-3">{t('player.crossword_correct_words')}:</p>

          {acrossWords.length > 0 && (
            <div className="mb-4">
              <h4 className="font-bold text-gray-700 border-b mb-2">Across</h4>
              <div className="flex flex-col gap-2">
                {acrossWords.map((clue, i) => (
                  <span
                    key={`across-${i}`}
                    className={`px-3 py-2 rounded-lg text-sm font-bold ${clue.isCorrect
                      ? "bg-green-100 text-green-800 border-2 border-green-500"
                      : "bg-red-100 text-red-800 border-2 border-red-500"
                      }`}
                  >
                    {clue.number}. {clue.answer} {clue.isCorrect ? "✓" : "✗"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {downWords.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-700 border-b mb-2">Down</h4>
              <div className="flex flex-col gap-2">
                {downWords.map((clue, i) => (
                  <span
                    key={`down-${i}`}
                    className={`px-3 py-2 rounded-lg text-sm font-bold ${clue.isCorrect
                      ? "bg-green-100 text-green-800 border-2 border-green-500"
                      : "bg-red-100 text-red-800 border-2 border-red-500"
                      }`}
                  >
                    {clue.number}. {clue.answer} {clue.isCorrect ? "✓" : "✗"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

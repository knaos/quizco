import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CrosswordClue, CrosswordContent } from "@quizco/shared";
import { ArrowBigDown, ArrowBigRight } from "lucide-react";

interface CrosswordAudienceViewProps {
  content: CrosswordContent;
  testIdPrefix?: string;
}

function calculateCellNumbers(clues: CrosswordContent["clues"]): Map<string, number> {
  const cellToNumber = new Map<string, number>();

  const allClues: CrosswordClue[] = [...(clues.across || []), ...(clues.down || [])];
  const uniqueStarts = new Map<string, CrosswordClue[]>();

  allClues.forEach((clue) => {
    const key = `${clue.y}-${clue.x}`;
    if (!uniqueStarts.has(key)) {
      uniqueStarts.set(key, []);
    }
    uniqueStarts.get(key)?.push(clue);
  });

  uniqueStarts.forEach((startingClues, key) => {
    cellToNumber.set(key, startingClues[0].number);
  });

  return cellToNumber;
}

export const CrosswordAudienceView: React.FC<CrosswordAudienceViewProps> = ({
  content,
  testIdPrefix = "audience",
}) => {
  const { t } = useTranslation();
  const cellNumbers = useMemo(
    () => calculateCellNumbers(content.clues),
    [content.clues],
  );

  return (
    <div
      className="flex flex-col md:flex-row gap-8 items-start"
      data-testid={`${testIdPrefix}-crossword`}
    >
      <div
        className="grid gap-1 bg-gray-300 p-1 rounded shadow-lg"
        style={{
          gridTemplateColumns: `repeat(${content.grid?.[0]?.length || 0}, 48px)`,
        }}
      >
        {content.grid.map((row, rowIndex) =>
          row.map((cell, columnIndex) => {
            const cellNumber = cellNumbers.get(`${rowIndex}-${columnIndex}`);
            const isBlocked = cell.trim() === "";

            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                data-testid={`${testIdPrefix}-crossword-cell-${rowIndex}-${columnIndex}`}
                className="w-12 h-12 flex items-center justify-center rounded-sm relative bg-white"
              >
                {isBlocked ? (
                  <div className="w-full h-full bg-gray-800 rounded-sm" />
                ) : (
                  <>
                    {cellNumber && (
                      <span className="absolute top-0.5 left-1 text-[12px] font-bold text-blue-600 leading-none">
                        {cellNumber}
                      </span>
                    )}
                    <span className="text-xl font-bold uppercase text-gray-700 opacity-40">
                      &bull;
                    </span>
                  </>
                )}
              </div>
            );
          }),
        )}
      </div>

      <div className="flex-1 space-y-4 text-left">
        <div>
          <h3 className="font-bold text-lg bg-blue-600 text-white rounded-lg mb-2 p-2 inline-flex items-center gap-1">
            {t("host.across")} <ArrowBigRight className="fill-white w-5 h-5" />
          </h3>
          <ul className="space-y-1">
            {content.clues.across.map((clue, index) => (
              <li
                key={index}
                data-testid={`${testIdPrefix}-crossword-across-${index}`}
              >
                <span className="font-bold">{clue.number}.</span> {clue.clue}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-lg bg-blue-600 text-white rounded-lg mb-2 p-2 inline-flex items-center gap-1">
            {t("host.down")} <ArrowBigDown className="fill-white w-5 h-5" />
          </h3>
          <ul className="space-y-1">
            {content.clues.down.map((clue, index) => (
              <li
                key={index}
                data-testid={`${testIdPrefix}-crossword-down-${index}`}
              >
                <span className="font-bold">{clue.number}.</span> {clue.clue}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

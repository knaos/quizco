import React from "react";
import { CheckCircle } from "lucide-react";

interface MultipleChoicePlayerProps {
  options: string[];
  selectedIndices: number[];
  onToggleIndex: (index: number) => void;
  disabled?: boolean;
  /** When true, shows preview UI with step-based reveal (options shown as "?" until revealed) */
  previewMode?: boolean;
  /** Number of options to reveal in preview mode (indices < revealStep show actual text, rest show "?") */
  revealStep?: number;
  testIdPrefix?: string;
}

/**
 * Renders a multiple choice question interface for players.
 * Allows selecting one or more options. Submit is handled by parent.
 * In preview mode, options are revealed step-by-step based on revealStep prop.
 */
export const MultipleChoicePlayer: React.FC<MultipleChoicePlayerProps> = ({
  options,
  selectedIndices,
  onToggleIndex,
  disabled = false,
  previewMode = false,
  revealStep = 0,
  testIdPrefix = "player",
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((opt: string, i: number) => {
          const isSelected = selectedIndices.includes(i);

          // In preview mode, show "?" for unrevealed options
          const isRevealed = i < revealStep;
          const displayText = previewMode && !isRevealed ? "?" : opt;

          return (
            <button
              key={i}
              onClick={() => onToggleIndex(i)}
              disabled={disabled || previewMode}
              data-testid={`${testIdPrefix}-choice-${i}`}
              className={`border-4 p-6 rounded-2xl text-xl font-black transition-all transform flex items-center justify-between ${
                previewMode
                  ? isRevealed
                    ? "bg-white border-blue-100 shadow-lg text-gray-800 cursor-default"
                    : "bg-gray-100 border-transparent text-gray-400 cursor-default"
                  : isSelected
                    ? "text-left bg-blue-600 border-blue-400 text-white shadow-lg translate-y-[-2px] active:scale-95"
                    : "text-left bg-white border-gray-100 text-gray-700 hover:border-blue-200 active:scale-95"
              }`}
            >
              <span className={!previewMode || isRevealed ? undefined : "flex-1 text-center text-3xl"}>
                {displayText}
              </span>
              {!previewMode && isSelected && (
                <CheckCircle className="w-6 h-6 text-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

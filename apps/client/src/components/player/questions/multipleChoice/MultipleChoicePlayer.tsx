import React from "react";
import { CheckCircle } from "lucide-react";

interface MultipleChoicePlayerProps {
  options: string[];
  selectedIndices: number[];
  onToggleIndex: (index: number) => void;
  disabled?: boolean;
}

/**
 * Renders a multiple choice question interface for players.
 * Allows selecting one or more options. Submit is handled by parent.
 */
export const MultipleChoicePlayer: React.FC<MultipleChoicePlayerProps> = ({
  options,
  selectedIndices,
  onToggleIndex,
  disabled = false,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((opt: string, i: number) => {
          const isSelected = selectedIndices.includes(i);
          return (
            <button
              key={i}
              onClick={() => onToggleIndex(i)}
              disabled={disabled}
              data-testid={`player-choice-${i}`}
              className={`border-4 p-6 rounded-2xl text-xl font-black transition-all transform active:scale-95 text-left flex items-center justify-between ${isSelected
                  ? "bg-blue-600 border-blue-400 text-white shadow-lg translate-y-[-2px]"
                  : "bg-white border-gray-100 text-gray-700 hover:border-blue-200"
                }`}
            >
              <span>{opt}</span>
              {isSelected && (
                <CheckCircle className="w-6 h-6 text-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

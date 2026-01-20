import React, { useState, useEffect } from "react";
import type { MatchingContent } from "@quizco/shared";

interface MatchingPlayerProps {
  content: MatchingContent;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
}

export const MatchingPlayer: React.FC<MatchingPlayerProps> = ({
  content,
  value,
  onChange,
  disabled,
}) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [leftItems, setLeftItems] = useState<{ id: string; text: string }[]>([]);
  const [rightItems, setRightItems] = useState<string[]>([]);

  useEffect(() => {
    const left = content.pairs.map((p) => ({ id: p.id, text: p.left }));
    const right = content.pairs.map((p) => p.right);

    // Use Fisher-Yates shuffle or similar for stable and pure-compliant shuffling in useEffect
    const shuffle = <T,>(array: T[]): T[] => {
      const newArr = [...array];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      return newArr;
    };

    setLeftItems(shuffle(left));
    setRightItems(shuffle(right));
  }, [content]);

  const handleLeftClick = (id: string) => {
    if (disabled) return;
    setSelectedLeft(id === selectedLeft ? null : id);
  };

  const handleRightClick = (rightText: string) => {
    if (disabled || !selectedLeft) return;

    const newValue = { ...value };
    // Remove any existing match for this right item
    Object.keys(newValue).forEach((key) => {
      if (newValue[key] === rightText) {
        delete newValue[key];
      }
    });

    newValue[selectedLeft] = rightText;
    onChange(newValue);
    setSelectedLeft(null);
  };

  const clearMatch = (leftId: string) => {
    if (disabled) return;
    const newValue = { ...value };
    delete newValue[leftId];
    onChange(newValue);
  };

  return (
    <div className="w-full grid grid-cols-2 gap-8">
      <div className="space-y-4">
        {leftItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleLeftClick(item.id)}
            disabled={disabled}
            className={`w-full p-4 rounded-2xl text-lg font-bold border-4 transition-all flex items-center justify-between ${
              selectedLeft === item.id
                ? "bg-blue-600 border-blue-400 text-white shadow-lg translate-y-[-2px]"
                : value[item.id]
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-white border-gray-100 text-gray-700 hover:border-blue-200"
            }`}
          >
            <span>{item.text}</span>
            {value[item.id] && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearMatch(item.id);
                }}
                className="text-green-600 hover:text-red-500"
              >
                ✕
              </button>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {rightItems.map((text, i) => {
          const matchedLeftId = Object.keys(value).find(
            (key) => value[key] === text
          );
          const matchedLeftItem = matchedLeftId
            ? leftItems.find((l) => l.id === matchedLeftId)
            : null;

          return (
            <button
              key={i}
              onClick={() => handleRightClick(text)}
              disabled={disabled || !selectedLeft}
              className={`w-full p-4 rounded-2xl text-lg font-bold border-4 transition-all text-left flex flex-col ${
                matchedLeftItem
                  ? "bg-green-50 border-green-200 text-green-800"
                  : selectedLeft
                  ? "bg-white border-blue-200 text-blue-600 animate-pulse"
                  : "bg-gray-50 border-transparent text-gray-400 cursor-not-allowed"
              }`}
            >
              <span>{text}</span>
              {matchedLeftItem && (
                <span className="text-xs uppercase font-black opacity-60 mt-1">
                  Matched with: {matchedLeftItem.text}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

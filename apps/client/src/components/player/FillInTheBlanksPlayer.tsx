import React from "react";
import type { FillInTheBlanksContent } from "@quizco/shared";

interface FillInTheBlanksPlayerProps {
  content: FillInTheBlanksContent;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export const FillInTheBlanksPlayer: React.FC<FillInTheBlanksPlayerProps> = ({
  content,
  value,
  onChange,
  disabled,
}) => {
  const parts = content.text.split(/(\{?\d+\}?)/g);

  const updateBlank = (index: number, val: string) => {
    const newValue = [...value];
    while (newValue.length <= index) {
      newValue.push("");
    }
    newValue[index] = val;
    onChange(newValue);
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-blue-500 text-left leading-loose text-2xl font-medium text-gray-800">
      {parts.map((part, i) => {
        const match = part.match(/\{?(\d+)\}?/);
        if (match) {
          const index = parseInt(match[1]);
          const blankConfig = content.blanks[index];
          if (!blankConfig) return <span key={i} className="text-red-500">[{part}]</span>;

          return (
            <select
              key={i}
              value={value[index] || ""}
              onChange={(e) => updateBlank(index, e.target.value)}
              disabled={disabled}
              className="mx-2 px-3 py-1 border-b-4 border-blue-200 focus:border-blue-500 outline-none transition bg-blue-50/30 rounded-t-lg min-w-[120px] text-center font-bold text-blue-700 appearance-none cursor-pointer"
            >
              <option value="">...</option>
              {blankConfig.options.map((opt, oIdx) => (
                <option key={oIdx} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </select>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

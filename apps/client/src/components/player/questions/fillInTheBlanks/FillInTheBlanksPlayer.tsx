import React from "react";
import type { FillInTheBlanksContent } from "@quizco/shared";

interface FillInTheBlanksPlayerProps {
  content: FillInTheBlanksContent;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  /** When true, shows placeholder dots instead of dropdowns - used in QUESTION_PREVIEW phase */
  previewMode?: boolean;
}

export const FillInTheBlanksPlayer: React.FC<FillInTheBlanksPlayerProps> = ({
  content,
  value,
  onChange,
  disabled,
  previewMode = false,
}) => {
  const parts = content.text.split(/(\{?\d+\}?)/g);

  // Initialize with prefill if enabled and no value exists (only in active mode)
  React.useEffect(() => {
    if (!previewMode && content.prefill && value.length === 0 && content.blanks.length > 0) {
      const prefilled = content.blanks.map((blank) => blank.options[0]?.value || "");
      onChange(prefilled);
    }
  }, [previewMode, content.prefill, content.blanks, value.length, onChange]);

  const updateBlank = (index: number, val: string) => {
    const newValue = [...value];
    while (newValue.length <= index) {
      newValue.push("");
    }
    newValue[index] = val;
    onChange(newValue);
  };

  // In preview mode, show placeholder dots for blanks
  if (previewMode) {
    return (
      <div className="space-y-6 w-full text-left leading-loose text-2xl font-medium text-gray-800">
        {parts.map((part, i) => {
          const match = part.match(/\{?(\d+)\}?/);
          if (match) {
            const index = parseInt(match[1]);
            const blankConfig = content.blanks[index];
            if (!blankConfig) return <span key={i} className="text-red-500">[{part}]</span>;

            // Show placeholder dots - same visual style as when no option is selected
            return (
              <span
                key={i}
                data-testid={`fill-blank-preview-${index}`}
                className="mx-2 px-3 py-1 border-b-4 border-gray-200 bg-gray-50/50 rounded-t-lg min-w-[120px] text-center font-bold text-gray-400 inline-block"
              >
                ...
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  }

  // Normal active mode with dropdowns
  return (
    <div className="space-y-6 w-full text-left leading-loose text-2xl font-medium text-gray-800">
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
              data-testid={`fill-blank-${index}`}
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

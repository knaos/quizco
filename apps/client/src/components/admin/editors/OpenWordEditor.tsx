import React from "react";
import type { OpenWordContent } from "@quizco/shared";

interface OpenWordEditorProps {
  content: OpenWordContent;
  onChange: (content: OpenWordContent) => void;
}

export const OpenWordEditor: React.FC<OpenWordEditorProps> = ({
  content,
  onChange,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-600 uppercase">Correct Answer</label>
      <input
        type="text"
        value={content?.answer || ""}
        onChange={(e) => onChange({ ...content, answer: e.target.value })}
        className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
        placeholder="Enter the correct answer"
      />
    </div>
  );
};

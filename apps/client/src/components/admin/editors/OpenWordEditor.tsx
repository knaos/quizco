import React from "react";
import type { OpenWordContent } from "@quizco/shared";
import Input from "../../ui/Input";

interface OpenWordEditorProps {
  content: OpenWordContent;
  onChange: (content: OpenWordContent) => void;
}

export const OpenWordEditor: React.FC<OpenWordEditorProps> = ({
  content,
  onChange,
}) => {
  return (
    <Input
      label="Correct Answer"
      type="text"
      value={content?.answer || ""}
      onChange={(e) => onChange({ ...content, answer: e.target.value })}
      placeholder="Enter the correct answer"
    />
  );
};

import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <Input
      label={t("admin.openWordEditor.correct_answer")}
      type="text"
      value={content?.answer || ""}
      onChange={(e) => onChange({ ...content, answer: e.target.value })}
      placeholder={t("admin.openWordEditor.placeholder")}
    />
  );
};

import React from "react";
import type { TrueFalseContent } from "@quizco/shared";
import { useTranslation } from "react-i18next";
import Button from "../../ui/Button";

interface TrueFalseEditorProps {
  content: TrueFalseContent;
  onChange: (content: TrueFalseContent) => void;
}

const TrueFalseEditor: React.FC<TrueFalseEditorProps> = ({
  content,
  onChange,
}) => {
  const { t } = useTranslation();

  const toggleAnswer = () => {
    onChange({ ...content, isTrue: !content.isTrue });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <span className="font-medium text-lg">{t("admin.correct_answer")}:</span>
        <Button
          onClick={toggleAnswer}
          variant={content.isTrue ? "success" : "danger"}
          className="rounded-full"
        >
          {content.isTrue ? t("game.true") : t("game.false")}
        </Button>
      </div>
      <p className="text-sm text-gray-500 italic">
        {t("admin.true_false_hint")}
      </p>
    </div>
  );
};

export default TrueFalseEditor;

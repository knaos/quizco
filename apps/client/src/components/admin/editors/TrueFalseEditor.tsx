import React from "react";
import type { TrueFalseContent } from "@quizco/shared";
import { useTranslation } from "react-i18next";

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
        <button
          onClick={toggleAnswer}
          className={`px-6 py-2 rounded-full font-bold transition-colors ${
            content.isTrue
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {content.isTrue ? t("game.true") : t("game.false")}
        </button>
      </div>
      <p className="text-sm text-gray-500 italic">
        {t("admin.true_false_hint")}
      </p>
    </div>
  );
};

export default TrueFalseEditor;

import React from "react";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

interface QuestionSourceProps {
  source?: string | null;
  testId?: string;
  className?: string;
}

export const QuestionSource: React.FC<QuestionSourceProps> = ({
  source,
  testId = "question-source",
  className = "",
}) => {
  const { t } = useTranslation();
  const normalizedSource = source?.trim();

  if (!normalizedSource) {
    return null;
  }

  return (
    <div
      className={`mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 ${className}`}
      data-testid={testId}
    >
      <BookOpen className="mt-1 h-6 w-6 flex-none text-amber-600" aria-hidden="true" />
      <div>
        <p className="text-sm font-black uppercase tracking-widest text-amber-700">
          {t("player.source")}
        </p>
        <p className="mt-1 text-xl font-black leading-snug">{normalizedSource}</p>
      </div>
    </div>
  );
};

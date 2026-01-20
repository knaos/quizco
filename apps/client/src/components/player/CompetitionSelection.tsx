import React from "react";
import { Trophy, ChevronRight } from "lucide-react";
import { LanguageSwitcher } from "../LanguageSwitcher";
import type { Competition } from "@quizco/shared";
import { useTranslation } from "react-i18next";

interface CompetitionSelectionProps {
  competitions: Competition[];
  onSelect: (id: string) => void;
}

export const CompetitionSelection: React.FC<CompetitionSelectionProps> = ({
  competitions,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-black text-center mb-8 text-gray-800 tracking-tight">
          {t("player.pick_quiz")}
        </h1>
        <div className="space-y-4">
          {competitions.length === 0 ? (
            <p className="text-center text-gray-500 font-medium">
              {t("player.no_active_quizzes")}
            </p>
          ) : (
            competitions.map((comp) => (
              <button
                key={comp.id}
                onClick={() => onSelect(comp.id)}
                className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-blue-50 border-2 border-transparent hover:border-blue-500 rounded-2xl transition-all group"
              >
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-xl group-hover:bg-blue-500 transition-colors mr-4">
                    <Trophy className="w-5 h-5 text-blue-600 group-hover:text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-700">
                    {comp.title}
                  </span>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-blue-500" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

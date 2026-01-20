import React from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface JoinTeamFormProps {
  teamName: string;
  setTeamName: (name: string) => void;
  color: string;
  setColor: (color: string) => void;
  isJoining: boolean;
  onJoin: (e: React.FormEvent) => void;
  onChangeQuiz: () => void;
}

export const JoinTeamForm: React.FC<JoinTeamFormProps> = ({
  teamName,
  setTeamName,
  color,
  setColor,
  isJoining,
  onJoin,
  onChangeQuiz,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4">
        <button
          onClick={onChangeQuiz}
          className="text-white/80 hover:text-white flex items-center font-bold"
        >
          <ChevronRight className="w-5 h-5 rotate-180 mr-1" />{" "}
          {t("player.change_quiz")}
        </button>
      </div>
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <form
        onSubmit={onJoin}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          {t("player.join_title")}
        </h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("player.team_name")}
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder={t("player.team_name")}
              disabled={isJoining}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("player.pick_color")}
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-12 rounded-lg cursor-pointer"
              disabled={isJoining}
            />
          </div>
          <button
            type="submit"
            disabled={isJoining}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl transition text-lg shadow-lg flex justify-center items-center"
          >
            {isJoining ? (
              <Loader2 className="animate-spin" />
            ) : (
              t("player.lets_go")
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

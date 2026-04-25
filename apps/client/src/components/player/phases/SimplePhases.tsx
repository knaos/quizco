import React from "react";
import { Trophy, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../ui/Card";
import type { GameState } from "@quizco/shared";

export const WaitingPhase: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-700">
      <Card
        variant="elevated"
        className="p-12 rounded-[3rem] border-b-8 border-blue-600"
      >
        <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-5xl font-black text-gray-900 mb-4">
          {t("player.waiting_host")}
        </h2>
        <p className="text-2xl text-gray-500 font-bold">{t("player.get_ready")}</p>
      </Card>
    </div>
  );
};

interface RoundTransitionPhaseProps {
  phase: "ROUND_START" | "ROUND_END";
  currentQuestion?: { roundId?: string } | null;
}

export const RoundTransitionPhase: React.FC<RoundTransitionPhaseProps> = ({
  phase,
  currentQuestion,
}) => {
  const { t } = useTranslation();

  if (phase === "ROUND_START") {
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
        <Card
          variant="elevated"
          className="p-16 rounded-[4rem] border-b-8 border-purple-600"
        >
          <span className="text-purple-600 font-black uppercase tracking-[0.3em] text-xl mb-4 block">
            {t("player.new_round")}
          </span>
          <h2 className="text-6xl font-black text-gray-900 mb-2">
            {currentQuestion?.roundId ? t("player.get_ready_exclaim") : t("player.round_start")}
          </h2>
          <p className="text-3xl text-gray-500 font-bold italic">
            {t("player.prepare_minds")}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in zoom-in duration-700">
      <Card
        variant="elevated"
        className="p-16 rounded-[4rem] border-b-8 border-green-600"
      >
        <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
        <h2 className="text-5xl font-black text-gray-900 mb-4">
          {t("player.round_finished")}
        </h2>
        <p className="text-2xl text-gray-500 font-bold">{t("player.great_job")}</p>
        <div className="mt-8 p-6 bg-green-50 rounded-3xl inline-block">
          <p className="text-green-800 font-black text-xl">
            {t("player.waiting_next_round")}
          </p>
        </div>
      </Card>
    </div>
  );
};

interface LeaderboardPhaseProps {
  teams: GameState["teams"];
}

export const LeaderboardPhase: React.FC<LeaderboardPhaseProps> = ({ teams }) => {
  const { t } = useTranslation();

  return (
    <div
      className="w-full max-w-4xl space-y-8 animate-in zoom-in duration-700"
      data-testid="player-leaderboard"
    >
      <Card
        variant="elevated"
        className="p-12 rounded-[3rem] border-b-8 border-blue-600"
      >
        <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-5xl font-black text-gray-900 mb-8">
          {t("host.leaderboard")}
        </h2>

        <div className="space-y-4">
          {[...teams]
            .sort((a, b) => b.score - a.score)
            .map((team, idx) => (
              <div
                key={team.id}
                data-testid={`leaderboard-team-${team.name}`}
                className={`flex items-center justify-between p-6 rounded-3xl ${
                  idx === 0
                    ? "bg-yellow-50 border-4 border-yellow-200"
                    : "bg-gray-50 border-4 border-transparent"
                }`}
              >
                <div className="flex items-center space-x-6">
                  <span className="text-3xl font-black text-gray-400 w-12">
                    {idx + 1}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full shadow-inner"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-3xl font-black text-gray-800">
                    {team.name}
                  </span>
                </div>
                <span className="text-4xl font-black text-blue-600">
                  {team.score}
                </span>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
};

import React from "react";
import { PauseCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../ui/Card";

export const TimerPausedPhase: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-700">
      <Card
        variant="elevated"
        className="p-12 rounded-[3rem] border-b-8 border-orange-500"
      >
        <PauseCircle className="w-24 h-24 text-orange-500 mx-auto mb-6" />
        <h2 className="text-5xl font-black text-gray-900 mb-4">
          {t("player.timer_paused")}
        </h2>
        <p className="text-2xl text-gray-500 font-bold">{t("player.timer_paused_subtitle")}</p>
      </Card>
    </div>
  );
};

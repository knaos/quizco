import React from "react";
import { Clock, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GameState } from "@quizco/shared";
import { Card } from "../ui/Card";
import type { AudienceAnswerStats } from "./audienceStats";
import { getQuestionRevealRenderer } from "../player/questionRenderers";

interface AudienceRevealPhaseProps {
  state: GameState;
  stats: AudienceAnswerStats | null;
}

export const AudienceRevealPhase: React.FC<AudienceRevealPhaseProps> = ({
  state,
}) => {
  const { t } = useTranslation();

  if (!state.currentQuestion) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in duration-500">
      <Card className="p-8 border-t-8 border-blue-500 text-left">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-600">
            <Info className="h-6 w-6" />
            <span className="font-bold uppercase tracking-widest text-sm">
              {t("player.reveal_phase")}
            </span>
          </div>
        </div>

        <h2 className="mb-8 text-2xl font-bold text-gray-800">
          {state.currentQuestion.questionText}
        </h2>

        <div className="space-y-6">
          {getQuestionRevealRenderer({
            question: state.currentQuestion,
            lastAnswer: null,
            t,
            variant: "audience",
          })}
        </div>
      </Card>

      <div className="mx-auto inline-block rounded-2xl bg-blue-600 p-6 text-white shadow-lg animate-pulse">
        <p className="flex items-center text-xl font-bold">
          <Clock className="mr-2" /> {t("player.next_soon")}
        </p>
      </div>
    </div>
  );
};

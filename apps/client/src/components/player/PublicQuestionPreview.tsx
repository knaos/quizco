import React from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GameState } from "@quizco/shared";
import Badge from "../ui/Badge";
import { Card } from "../ui/Card";

interface PublicQuestionPreviewProps {
  state: GameState;
  testIdPrefix?: string;
}

export const PublicQuestionPreview: React.FC<PublicQuestionPreviewProps> = ({
  state,
  testIdPrefix = "player",
}) => {
  const { t } = useTranslation();

  if (!state.currentQuestion) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
      {state.currentQuestion.section && (
        <Badge
          variant="yellow"
          className="p-4 rounded-2xl border-2 border-yellow-400 animate-bounce text-2xl"
        >
          {t("player.turn")}: {state.currentQuestion.section}
        </Badge>
      )}
      <Card
        variant="elevated"
        className="p-10 rounded-[2.5rem] border-b-8 border-yellow-500"
      >
        <span className="text-yellow-600 font-black uppercase tracking-widest text-lg mb-4 block">
          {t("player.upcoming_question")}
        </span>
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
          {state.currentQuestion.questionText}
        </h2>
      </Card>

      {state.currentQuestion.type === "MULTIPLE_CHOICE" && state.revealStep > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8">
          {state.currentQuestion.content.options.map((option: string, index: number) =>
            index < state.revealStep ? (
              <div
                key={index}
                data-testid={`${testIdPrefix}-preview-option-${index}`}
                className="p-8 rounded-3xl border-4 transition-all duration-500 transform bg-white border-blue-100 shadow-lg scale-100 opacity-100 translate-y-0"
              >
                <span className="text-3xl font-black text-gray-800 text-left">
                  {option}
                </span>
              </div>
            ) : null,
          )}
        </div>
      )}

      <div className="space-y-4">
        <Clock className="w-16 h-16 text-yellow-500 animate-spin-slow mx-auto" />
        <p className="text-2xl font-black text-gray-500 uppercase tracking-widest">
          {t("player.host_reading")}
        </p>
      </div>
    </div>
  );
};

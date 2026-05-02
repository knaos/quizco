import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { AnswerContent, GameState } from "@quizco/shared";
import { useTranslation } from "react-i18next";
import { PublicQuestionBody } from "../PublicQuestionBody";

type PlayerDraftAnswer = AnswerContent | null;

interface QuestionActivePhaseProps {
  state: GameState;
  hasSubmitted: boolean;
  selectedIndices: number[];
  answer: PlayerDraftAnswer;
  setAnswer: (val: PlayerDraftAnswer) => void;
  toggleIndex: (index: number) => void;
  submitAnswer: (value: PlayerDraftAnswer, isFinal?: boolean) => void;
  submissionStatus: "idle" | "success" | "error";
  currentTeam?: { isExplicitlySubmitted?: boolean };
  requestJoker?: () => void;
}

export const QuestionActivePhase: React.FC<QuestionActivePhaseProps> = ({
  state,
  hasSubmitted,
  selectedIndices,
  answer,
  setAnswer,
  toggleIndex,
  submitAnswer,
  submissionStatus,
  currentTeam,
  requestJoker,
}) => {
  const { t } = useTranslation();

  if (!state.currentQuestion) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl space-y-8">
      {!hasSubmitted ? (
        <PublicQuestionBody
          mode="interactive"
          state={state}
          hasSubmitted={hasSubmitted}
          selectedIndices={selectedIndices}
          answer={answer}
          setAnswer={setAnswer}
          toggleIndex={toggleIndex}
          submitAnswer={submitAnswer}
          requestJoker={requestJoker}
        />
      ) : (
        <div
          className={`rounded-2xl border-2 p-8 ${submissionStatus === "error"
              ? "border-red-500 bg-red-100"
              : submissionStatus === "success" || currentTeam?.isExplicitlySubmitted
                ? "border-green-500 bg-green-100"
                : "border-blue-500 bg-blue-100"
            }`}
          data-testid="player-submission-state"
        >
          {submissionStatus === "error" ? (
            <>
              <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
              <h2 className="text-2xl font-bold text-red-800">
                {t("player.answer_failed")}
              </h2>
            </>
          ) : (
            <>
              <CheckCircle
                className={`mx-auto mb-4 h-16 w-16 ${submissionStatus === "success" || currentTeam?.isExplicitlySubmitted
                    ? "text-green-500"
                    : "animate-pulse text-blue-500"
                  }`}
              />
              <h2
                className={`text-2xl font-bold ${submissionStatus === "success" || currentTeam?.isExplicitlySubmitted
                    ? "text-green-800"
                    : "text-blue-800"
                  }`}
              >
                {t("player.answer_received")}
              </h2>
              <p
                className={
                  submissionStatus === "success" || currentTeam?.isExplicitlySubmitted
                    ? "text-green-700"
                    : "text-blue-700"
                }
              >
                {t("player.waiting_others")}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

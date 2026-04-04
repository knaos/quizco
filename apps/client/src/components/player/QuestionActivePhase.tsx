import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { 
  GameState, 
  AnswerContent
} from "@quizco/shared";
import { PublicQuestionBody } from "./PublicQuestionBody";

interface QuestionActivePhaseProps {
  state: GameState;
  hasSubmitted: boolean;
  selectedIndices: number[];
  answer: AnswerContent;
  setAnswer: (val: AnswerContent) => void;
  toggleIndex: (index: number) => void;
  submitAnswer: (value: AnswerContent, isFinal?: boolean) => void;
  submissionStatus: "idle" | "success" | "error";
  currentTeam?: { isExplicitlySubmitted?: boolean };
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
}) => {
  const { t } = useTranslation();
  const { currentQuestion } = state;

  if (!currentQuestion) return null;

  return (
    <div className="w-full max-w-3xl space-y-8">
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
          submissionStatus={submissionStatus}
          currentTeam={currentTeam}
        />
      ) : (
        <div
          className={`p-8 rounded-2xl border-2 ${
            submissionStatus === "error"
              ? "bg-red-100 border-red-500"
              : submissionStatus === "success" ||
                currentTeam?.isExplicitlySubmitted
              ? "bg-green-100 border-green-500"
              : "bg-blue-100 border-blue-500"
          }`}
          data-testid="player-submission-state"
        >
          {submissionStatus === "error" ? (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-800">
                {t("player.answer_failed")}
              </h2>
            </>
          ) : (
            <>
              <CheckCircle
                className={`w-16 h-16 ${
                  submissionStatus === "success" ||
                  currentTeam?.isExplicitlySubmitted
                    ? "text-green-500"
                    : "text-blue-500"
                } mx-auto mb-4 ${
                  submissionStatus === "idle" &&
                  !currentTeam?.isExplicitlySubmitted
                    ? "animate-pulse"
                    : ""
                }`}
              />
              <h2
                className={`text-2xl font-bold ${
                  submissionStatus === "success" ||
                  currentTeam?.isExplicitlySubmitted
                    ? "text-green-800"
                    : "text-blue-800"
                }`}
              >
                {t("player.answer_received")}
              </h2>
              <p
                className={
                  submissionStatus === "success" ||
                  currentTeam?.isExplicitlySubmitted
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

      <div
        className="text-4xl font-black text-gray-300"
        data-testid="player-time-remaining"
      >
        {state.timeRemaining}s
      </div>
    </div>
  );
};

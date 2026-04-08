import React from "react";
import type { AnswerContent, GameState } from "@quizco/shared";
import { useTranslation } from "react-i18next";
import Badge from "../ui/Badge";
import { Card } from "../ui/Card";
import {
  getQuestionActiveRenderer,
  getQuestionReadOnlyRenderer,
} from "./questionRenderers";

interface InteractivePublicQuestionBodyProps {
  mode: "interactive";
  state: GameState;
  hasSubmitted: boolean;
  selectedIndices: number[];
  answer: AnswerContent;
  setAnswer: (value: AnswerContent) => void;
  toggleIndex: (index: number) => void;
  submitAnswer: (value: AnswerContent, isFinal?: boolean) => void;
  requestJoker?: () => void;
  testIdPrefix?: string;
}

interface ReadOnlyPublicQuestionBodyProps {
  mode: "readOnly";
  state: GameState;
  answer?: AnswerContent;
  selectedIndices?: number[];
  testIdPrefix?: string;
}

type PublicQuestionBodyProps =
  | InteractivePublicQuestionBodyProps
  | ReadOnlyPublicQuestionBodyProps;

export const PublicQuestionBody: React.FC<PublicQuestionBodyProps> = (props) => {
  const { t } = useTranslation();
  const { currentQuestion } = props.state;
  const testIdPrefix = props.testIdPrefix ?? "player";

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="space-y-8 text-left">
      {currentQuestion.section ? (
        <Badge
          variant="yellow"
          className="p-4 rounded-2xl border-2 border-yellow-400 text-2xl"
        >
          {t("player.turn")}: {currentQuestion.section}
        </Badge>
      ) : null}

      <Card className="p-8 border-b-4 border-blue-500">
        <span className="text-blue-600 font-bold uppercase tracking-wider text-sm">
          {t("player.question")}
        </span>
        <h2
          className="text-2xl md:text-3xl font-bold mt-2 text-gray-800"
          data-testid={`${testIdPrefix}-active-question-text`}
        >
          {currentQuestion.questionText}
        </h2>
      </Card>

      <div className="space-y-6 w-full">
        {props.mode === "interactive"
          ? getQuestionActiveRenderer({
              question: currentQuestion,
              answer: props.answer,
              selectedIndices: props.selectedIndices,
              hasSubmitted: props.hasSubmitted,
              setAnswer: props.setAnswer,
              toggleIndex: props.toggleIndex,
              submitAnswer: props.submitAnswer,
              requestJoker: props.requestJoker,
              testIdPrefix,
              t,
            })
          : getQuestionReadOnlyRenderer({
              question: currentQuestion,
              answer: props.answer,
              selectedIndices: props.selectedIndices,
              testIdPrefix,
              t,
            })}
      </div>
    </div>
  );
};

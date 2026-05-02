import React from "react";
import type { AnswerContent, GameState } from "@quizco/shared";
import { useTranslation } from "react-i18next";
import { Card } from "../ui/Card";
import {
  getQuestionActiveRenderer,
  getQuestionReadOnlyRenderer,
} from "./questionRenderers";
import { AnalogueTimer } from "./AnalogueTimer";

interface InteractivePublicQuestionBodyProps {
  mode: "interactive";
  state: GameState;
  hasSubmitted: boolean;
  selectedIndices: number[];
  answer: AnswerContent;
  setAnswer: (value: AnswerContent) => void;
  toggleIndex: (index: number) => void;
  submitAnswer: (value: AnswerContent, isFinal?: boolean) => void;
  requestJoker?: (x: number, y: number) => void;
  jokerUsed?: boolean;
  jokerCost?: number;
  jokerRevealedCells?: Set<string>;
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
  const exampleQuestion = currentQuestion?.index === 0;
  const questionLabel =
    typeof currentQuestion?.index === "number"
      ? currentQuestion.section
        ? `${t("player.section")} ${currentQuestion.section}, ${t("player.question")} ${currentQuestion.index}`
        : `${t("player.question")} ${currentQuestion.index}`
      : currentQuestion?.section
        ? `${t("player.section")} ${currentQuestion.section}`
        : t("player.question");

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
      <Card
        variant="elevated"
        className={`p-10 rounded-3xl border-b-8 flex justify-between items-center gap-6 ${exampleQuestion ? "border-purple-500" : "border-blue-500"}`}
      >
        <div className="flex-1 text-left">
          <span className={`font-black uppercase tracking-widest text-lg mb-4 block ${exampleQuestion ? "text-purple-600" : "text-blue-600"}`}>
            {exampleQuestion
              ? t("player.example_question")
              : questionLabel}
          </span>
          <h2
            className="text-4xl font-black text-gray-900 leading-tight"
            data-testid={`${testIdPrefix}-active-question-text`}
          >
            {currentQuestion.questionText}
          </h2>
        </div>
        <AnalogueTimer
          timeRemaining={props.state.timeRemaining}
          totalTime={props.state.currentQuestion?.timeLimitSeconds || 30}
          testId={`${testIdPrefix}-time-remaining`}
        />
      </Card>

      <div className={`space-y-6 w-full bg-white p-8 rounded-3xl shadow-xl border-b-8 ${exampleQuestion ? "border-purple-500" : "border-blue-500"}`}>
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
            jokerUsed: props.jokerUsed,
            jokerCost: props.jokerCost,
            jokerRevealedCells: props.jokerRevealedCells,
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

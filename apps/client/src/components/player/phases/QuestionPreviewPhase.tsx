import React from "react";
import type { GameState } from "@quizco/shared";
import { PublicQuestionPreview } from "../PublicQuestionPreview";

interface QuestionPreviewPhaseProps {
  state: GameState;
}

export const QuestionPreviewPhase: React.FC<QuestionPreviewPhaseProps> = ({ state }) => {
  return <PublicQuestionPreview state={state} />;
};

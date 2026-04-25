import React from "react";
import { Clock, Info, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  ChronologyAnswer,
  ChronologyContent,
  CrosswordContent,
  FillInTheBlanksContent,
  GameState,
  MatchingContent,
} from "@quizco/shared";
import { Card } from "../../ui/Card";
import Badge from "../../ui/Badge";
import {
  calculateCrosswordScore,
  calculateFillInTheBlanksScore,
  calculateMatchingScore,
} from "../../../utils/scoreCalculations";
import { calculateChronologyScore } from "../questions/chronology/chronologyScore";
import { getQuestionRevealRenderer } from "../questionRenderers";

interface RevealAnswerPhaseProps {
  state: GameState;
  currentTeam?: { lastAnswer?: unknown };
  getGradingStatus: () => boolean | undefined;
  getCorrectAnswer: () => string;
  correctTheErrorPartialScore: number;
  teamName: string;
}

function getRevealBadge(
  state: GameState,
  currentTeam: { lastAnswer?: unknown } | undefined,
  gradingStatus: boolean | undefined,
  correctTheErrorPartialScore: number,
  t: (key: string) => string,
) {
  const currentQuestion = state.currentQuestion;
  if (!currentQuestion) {
    return null;
  }

  if (currentQuestion.type === "CORRECT_THE_ERROR") {
    if (!currentTeam?.lastAnswer) {
      return (
        <Badge variant="red">
          <Info className="mr-2 h-4 w-4" />
          {t("player.no_answer_submitted")}
        </Badge>
      );
    }
    const badgeVariant =
      correctTheErrorPartialScore === 2
        ? "green"
        : correctTheErrorPartialScore === 1
          ? "yellow"
          : "red";
    return (
      <Badge variant={badgeVariant}>
        {correctTheErrorPartialScore > 0 ? (
          <CheckCircle className="mr-2 h-4 w-4" />
        ) : (
          <XCircle className="mr-2 h-4 w-4" />
        )}
        {correctTheErrorPartialScore}/2
      </Badge>
    );
  }

  if (currentQuestion.type === "FILL_IN_THE_BLANKS") {
    const content = currentQuestion.content as FillInTheBlanksContent;
    const score = calculateFillInTheBlanksScore(
      content,
      currentTeam?.lastAnswer as string[] | null,
    );
    return (
      <Badge variant={score === content.blanks.length ? "green" : score > 0 ? "yellow" : "red"}>
        {score > 0 ? (
          <CheckCircle className="mr-2 h-4 w-4" />
        ) : (
          <XCircle className="mr-2 h-4 w-4" />
        )}
        {score}/{content.blanks.length}
      </Badge>
    );
  }

  if (currentQuestion.type === "MATCHING") {
    const content = currentQuestion.content as MatchingContent;
    const score = calculateMatchingScore(
      content,
      currentTeam?.lastAnswer as Record<string, string> | null,
    );
    return (
      <Badge variant={score === content.heroes.length ? "green" : score > 0 ? "yellow" : "red"}>
        {score > 0 ? (
          <CheckCircle className="mr-2 h-4 w-4" />
        ) : (
          <XCircle className="mr-2 h-4 w-4" />
        )}
        {score}/{content.heroes.length}
      </Badge>
    );
  }

  if (currentQuestion.type === "CROSSWORD") {
    const content = currentQuestion.content as CrosswordContent;
    const totalWords = (content.clues.across?.length || 0) + (content.clues.down?.length || 0);
    const score = calculateCrosswordScore(
      content,
      currentTeam?.lastAnswer as string[][] | null,
    );
    if (totalWords === 0) {
      return gradingStatus === true ? (
        <Badge variant="green">
          <CheckCircle className="mr-2 h-4 w-4" />
          {t("player.correct")}
        </Badge>
      ) : (
        <Badge variant="red">
          <XCircle className="mr-2 h-4 w-4" />
          {t("player.incorrect")}
        </Badge>
      );
    }
    return (
      <Badge variant={score === totalWords ? "green" : score > 0 ? "yellow" : "red"}>
        {score > 0 ? (
          <CheckCircle className="mr-2 h-4 w-4" />
        ) : (
          <XCircle className="mr-2 h-4 w-4" />
        )}
        {score}/{totalWords}
      </Badge>
    );
  }

  if (currentQuestion.type === "CHRONOLOGY") {
    const content = currentQuestion.content as ChronologyContent;
    const result = calculateChronologyScore(
      content,
      currentTeam?.lastAnswer as ChronologyAnswer | null,
    );
    const { correctCount, placedCount, totalItems } = result;
    const isIncomplete = placedCount < totalItems;

    if (placedCount === 0) {
      return gradingStatus === true ? (
        <Badge variant="green">
          <CheckCircle className="mr-2 h-4 w-4" />
          {t("player.correct")}
        </Badge>
      ) : (
        <Badge variant="red">
          <XCircle className="mr-2 h-4 w-4" />
          {t("player.incorrect")}
        </Badge>
      );
    }

    const badgeVariant = correctCount === totalItems ? "green" : correctCount > 0 ? "yellow" : "red";
    return (
      <Badge variant={badgeVariant}>
        {correctCount > 0 ? (
          <CheckCircle className="mr-2 h-4 w-4" />
        ) : (
          <XCircle className="mr-2 h-4 w-4" />
        )}
        {correctCount}/{placedCount}
        {isIncomplete && (
          <span className="ml-1.5">
            ({totalItems - placedCount} {t("player.chronology_not_placed")})
          </span>
        )}
      </Badge>
    );
  }

  if (gradingStatus === true) {
    return (
      <Badge variant="green">
        <CheckCircle className="mr-2 h-4 w-4" />
        {t("player.correct")}
      </Badge>
    );
  }

  if (gradingStatus === false) {
    return (
      <Badge variant="red">
        <XCircle className="mr-2 h-4 w-4" />
        {t("player.incorrect")}
      </Badge>
    );
  }

  return (
    <Badge variant="red">
      <Clock className="mr-2 h-4 w-4" />
      {t("player.no_answer")}
    </Badge>
  );
}

export const RevealAnswerPhase: React.FC<RevealAnswerPhaseProps> = ({
  state,
  currentTeam,
  getGradingStatus,
  correctTheErrorPartialScore,
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
            <span className="font-bold uppercase tracking-widest text-md">
              {t("player.reveal_phase")}
            </span>
          </div>
          {getRevealBadge(
            state,
            currentTeam,
            getGradingStatus(),
            correctTheErrorPartialScore,
            t,
          )}
        </div>

        <h2 className="mb-8 text-2xl font-bold text-gray-800">
          {state.currentQuestion.questionText}
        </h2>

        <div className="space-y-6">
          {getQuestionRevealRenderer({
            question: state.currentQuestion,
            lastAnswer: (currentTeam?.lastAnswer as never) ?? null,
            gradingStatus: getGradingStatus(),
            t,
            variant: "player",
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

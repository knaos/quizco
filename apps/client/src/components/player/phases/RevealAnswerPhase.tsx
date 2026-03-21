import React from "react";
import { Info, CheckCircle, XCircle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../ui/Card";
import Badge from "../../ui/Badge";
import { MultipleChoiceReveal } from "../questions/MultipleChoiceReveal";
import { ChronologyReveal } from "../questions/chronology/ChronologyReveal";
import { MatchingReveal } from "../questions/matching/MatchingReveal";
import { FillInTheBlanksReveal } from "../questions/fillInTheBlanks/FillInTheBlanksReveal";
import { CrosswordReveal } from "../questions/crossword/CrosswordReveal";
import { DefaultReveal } from "../questions/DefaultReveal";
import { CorrectTheErrorReveal } from "../questions/correctTheError/CorrectTheErrorReveal";
import { TrueFalseReveal } from "../questions/trueFalse/TrueFalseReveal";
import {
  calculateFillInTheBlanksScore,
  calculateMatchingScore,
  calculateCrosswordScore
} from "../../../utils/scoreCalculations";
import type {
  AnswerContent,
  GameState,
  MultipleChoiceQuestion,
  ChronologyContent,
  MatchingContent,
  FillInTheBlanksContent,
  CrosswordContent,
  CorrectTheErrorContent,
  TrueFalseContent,
  ChronologyAnswer
} from "@quizco/shared";

interface RevealAnswerPhaseProps {
  state: GameState;
  currentTeam?: { lastAnswer?: unknown };
  getGradingStatus: () => boolean | undefined;
  getCorrectAnswer: () => string;
  correctTheErrorPartialScore: number;
  teamName: string;
}

export const RevealAnswerPhase: React.FC<RevealAnswerPhaseProps> = ({
  state,
  currentTeam,
  getGradingStatus,
  getCorrectAnswer,
  correctTheErrorPartialScore,
  teamName,
}) => {
  const { t } = useTranslation();
  const { currentQuestion } = state;

  if (!currentQuestion) return null;

  return (
    <div className="w-full max-w-3xl space-y-8 animate-in fade-in zoom-in duration-500">
      <Card className="p-8 border-t-8 border-blue-500 text-left">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-blue-600">
            <Info className="w-6 h-6" />
            <span className="font-bold uppercase tracking-widest text-md">
              {t("player.reveal_phase")}
            </span>
          </div>
          {currentQuestion.type === "CORRECT_THE_ERROR" ? (
            (() => {
              const partialScore = correctTheErrorPartialScore;
              if (partialScore === 2) {
                return (
                  <Badge variant="green">
                    <CheckCircle className="w-4 h-4 mr-2" /> 2/2
                  </Badge>
                );
              } else if (partialScore === 1) {
                return (
                  <Badge variant="yellow">
                    <CheckCircle className="w-4 h-4 mr-2" /> 1/2
                  </Badge>
                );
              } else {
                return (
                  <Badge variant="red">
                    <XCircle className="w-4 h-4 mr-2" /> 0/2
                  </Badge>
                );
              }
            })()
          ) : currentQuestion.type === "FILL_IN_THE_BLANKS" ? (
            (() => {
              const fbContent = currentQuestion.content as FillInTheBlanksContent;
              const teamAnswer = currentTeam?.lastAnswer as string[] | null;
              const partialScore = calculateFillInTheBlanksScore(
                fbContent,
                teamAnswer
              );
              const totalBlanks = fbContent.blanks.length;

              if (partialScore === totalBlanks) {
                return (
                  <Badge variant="green">
                    <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/
                    {totalBlanks}
                  </Badge>
                );
              } else if (partialScore > 0) {
                return (
                  <Badge variant="yellow">
                    <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/
                    {totalBlanks}
                  </Badge>
                );
              } else {
                return (
                  <Badge variant="red">
                    <XCircle className="w-4 h-4 mr-2" /> {partialScore}/
                    {totalBlanks}
                  </Badge>
                );
              }
            })()
          ) : currentQuestion.type === "MATCHING" ? (
            (() => {
              const matchingContent = currentQuestion.content as MatchingContent;
              const teamAnswer = currentTeam?.lastAnswer as Record<
                string,
                string
              > | null;
              const partialScore = calculateMatchingScore(
                matchingContent,
                teamAnswer
              );
              const totalPairs = matchingContent.pairs.length;

              if (partialScore === totalPairs) {
                return (
                  <Badge variant="green">
                    <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/
                    {totalPairs}
                  </Badge>
                );
              } else if (partialScore > 0) {
                return (
                  <Badge variant="yellow">
                    <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/
                    {totalPairs}
                  </Badge>
                );
              } else {
                return (
                  <Badge variant="red">
                    <XCircle className="w-4 h-4 mr-2" /> {partialScore}/
                    {totalPairs}
                  </Badge>
                );
              }
            })()
          ) : currentQuestion.type === "CROSSWORD" ? (
            (() => {
              const crosswordContent = currentQuestion.content as CrosswordContent;
              const teamAnswer = currentTeam?.lastAnswer as string[][] | null;
              const partialScore = calculateCrosswordScore(
                crosswordContent,
                teamAnswer
              );
              const totalWords =
                (crosswordContent.clues?.across?.length || 0) +
                (crosswordContent.clues?.down?.length || 0);

              if (partialScore === totalWords && totalWords > 0) {
                return (
                  <Badge variant="green">
                    <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/
                    {totalWords}
                  </Badge>
                );
              } else if (partialScore > 0 && totalWords > 0) {
                return (
                  <Badge variant="yellow">
                    <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/
                    {totalWords}
                  </Badge>
                );
              } else if (totalWords === 0) {
                return getGradingStatus() === true ? (
                  <Badge variant="green">
                    <CheckCircle className="w-4 h-4 mr-2" /> {t("player.correct")}
                  </Badge>
                ) : (
                  <Badge variant="red">
                    <XCircle className="w-4 h-4 mr-2" /> {t("player.incorrect")}
                  </Badge>
                );
              } else {
                return (
                  <Badge variant="red">
                    <XCircle className="w-4 h-4 mr-2" /> {partialScore}/
                    {totalWords}
                  </Badge>
                );
              }
            })()
          ) : getGradingStatus() === true ? (
            <Badge variant="green">
              <CheckCircle className="w-4 h-4 mr-2" /> {t("player.correct")}
            </Badge>
          ) : getGradingStatus() === false ? (
            <Badge variant="red">
              <XCircle className="w-4 h-4 mr-2" /> {t("player.incorrect")}
            </Badge>
          ) : (
            <Badge variant="gray">
              <Clock className="w-4 h-4 mr-2" /> {t("player.waiting_grading")}
            </Badge>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-8">
          {currentQuestion.questionText}
        </h2>

        <div className="space-y-6">
          {currentQuestion.type === "MULTIPLE_CHOICE" ? (
            <MultipleChoiceReveal
              question={currentQuestion as MultipleChoiceQuestion}
              lastAnswer={currentTeam?.lastAnswer as number[] | null}
            />
          ) : currentQuestion.type === "CHRONOLOGY" ? (
            <ChronologyReveal
              content={currentQuestion.content as ChronologyContent}
              lastAnswer={currentTeam?.lastAnswer as ChronologyAnswer | null}
            />
          ) : currentQuestion.type === "MATCHING" ? (
            <MatchingReveal
              content={currentQuestion.content as MatchingContent}
              lastAnswer={currentTeam?.lastAnswer as Record<string, string> | null}
            />
          ) : currentQuestion.type === "FILL_IN_THE_BLANKS" ? (
            <FillInTheBlanksReveal
              content={currentQuestion.content as FillInTheBlanksContent}
              lastAnswer={currentTeam?.lastAnswer as string[] | null}
            />
          ) : currentQuestion.type === "CROSSWORD" ? (
            <CrosswordReveal
              content={currentQuestion.content as CrosswordContent}
              lastAnswer={currentTeam?.lastAnswer as string[][] | null}
            />
          ) : currentQuestion.type === "CORRECT_THE_ERROR" ? (
            <CorrectTheErrorReveal
              content={currentQuestion.content as CorrectTheErrorContent}
              lastAnswer={
                state.teams.find((t) => t.name === teamName)?.lastAnswer as {
                  selectedPhraseIndex: number;
                  correction: string;
                } | null
              }
            />
          ) : currentQuestion.type === "TRUE_FALSE" ? (
            <TrueFalseReveal
              content={currentQuestion.content as TrueFalseContent}
              lastAnswer={
                state.teams.find((t) => t.name === teamName)
                  ?.lastAnswer as boolean | null
              }
            />
          ) : (
            <DefaultReveal
              lastAnswer={currentTeam?.lastAnswer as AnswerContent}
              gradingStatus={getGradingStatus()}
              getCorrectAnswer={getCorrectAnswer}
            />
          )}
        </div>
      </Card>

      <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg animate-pulse inline-block mx-auto">
        <p className="text-xl font-bold flex items-center">
          <Clock className="mr-2" /> {t("player.next_soon")}
        </p>
      </div>
    </div>
  );
};

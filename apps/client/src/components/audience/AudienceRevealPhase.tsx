import React from "react";
import { Clock, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  ChronologyAnswer,
  ChronologyContent,
  CorrectTheErrorContent,
  CrosswordContent,
  FillInTheBlanksContent,
  GameState,
  MatchingContent,
  MultipleChoiceQuestion,
} from "@quizco/shared";
import { Card } from "../ui/Card";
import { MultipleChoiceReveal } from "../player/questions/multipleChoice/MultipleChoiceReveal";
import { ChronologyReveal } from "../player/questions/chronology/ChronologyReveal";
import { MatchingReveal } from "../player/questions/matching/MatchingReveal";
import { FillInTheBlanksReveal } from "../player/questions/fillInTheBlanks/FillInTheBlanksReveal";
import { CrosswordReveal } from "../player/questions/crossword/CrosswordReveal";
import { CorrectTheErrorReveal } from "../player/questions/correctTheError/CorrectTheErrorReveal";
import { TrueFalseReveal } from "../player/questions/trueFalse/TrueFalseReveal";
import type { AudienceAnswerStats } from "./audienceStats";
import { getQuestionCorrectAnswer } from "../player/questionText";

interface AudienceRevealPhaseProps {
  state: GameState;
  stats: AudienceAnswerStats | null;
}

function buildCorrectChronologyAnswer(
  content: ChronologyContent,
): ChronologyAnswer {
  const ordered = [...content.items].sort((a, b) => a.order - b.order);

  return {
    slotIds: ordered.map((item) => item.id),
    poolIds: [],
  };
}

export const AudienceRevealPhase: React.FC<AudienceRevealPhaseProps> = ({
  state,
  stats,
}) => {
  const { t } = useTranslation();

  if (!state.currentQuestion) {
    return null;
  }

  const { currentQuestion } = state;

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in duration-500">
      <Card className="p-8 border-t-8 border-blue-500 text-left">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-blue-600">
            <Info className="w-6 h-6" />
            <span className="font-bold uppercase tracking-widest text-sm">
              {t("player.reveal_phase")}
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-8">
          {currentQuestion.questionText}
        </h2>

        <div className="space-y-6">
          {currentQuestion.type === "MULTIPLE_CHOICE" ? (
            <MultipleChoiceReveal
              question={currentQuestion as MultipleChoiceQuestion}
              lastAnswer={currentQuestion.content.correctIndices}
              showSelectionLabels={false}
            />
          ) : currentQuestion.type === "CHRONOLOGY" ? (
            <ChronologyReveal
              content={currentQuestion.content as ChronologyContent}
              lastAnswer={buildCorrectChronologyAnswer(currentQuestion.content as ChronologyContent)}
            />
          ) : currentQuestion.type === "MATCHING" ? (
            <MatchingReveal
              content={currentQuestion.content as MatchingContent}
              lastAnswer={Object.fromEntries(
                (currentQuestion.content as MatchingContent).pairs.map((pair) => [
                  pair.id,
                  pair.right,
                ]),
              )}
            />
          ) : currentQuestion.type === "FILL_IN_THE_BLANKS" ? (
            <FillInTheBlanksReveal
              content={currentQuestion.content as FillInTheBlanksContent}
              lastAnswer={(currentQuestion.content as FillInTheBlanksContent).blanks.map(
                (blank) => blank.options.find((option) => option.isCorrect)?.value || "",
              )}
            />
          ) : currentQuestion.type === "CROSSWORD" ? (
            <CrosswordReveal
              content={currentQuestion.content as CrosswordContent}
              lastAnswer={(currentQuestion.content as CrosswordContent).grid}
            />
          ) : currentQuestion.type === "CORRECT_THE_ERROR" ? (
            <CorrectTheErrorReveal
              content={currentQuestion.content as CorrectTheErrorContent}
              lastAnswer={{
                selectedPhraseIndex: (currentQuestion.content as CorrectTheErrorContent).errorPhraseIndex,
                correction: (currentQuestion.content as CorrectTheErrorContent).correctReplacement,
              }}
            />
          ) : currentQuestion.type === "TRUE_FALSE" ? (
            <TrueFalseReveal
              content={currentQuestion.content}
              lastAnswer={currentQuestion.content.isTrue}
            />
          ) : (
            <div
              className="bg-green-50 p-6 rounded-2xl border-2 border-green-200"
              data-testid="audience-correct-answer"
            >
              <span className="text-green-600 text-xs font-bold uppercase">
                {t("player.correct_answer")}
              </span>
              <p className="text-2xl font-black text-green-900 mt-1">
                {getQuestionCorrectAnswer(currentQuestion, t)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {stats && (
        <Card
          className="p-6 text-left border-b-4 border-blue-500"
          data-testid="audience-answer-stats"
        >
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            {t("audience.answer_summary")}
          </p>
          <p className="mt-2 text-3xl font-black text-gray-900">
            {t("audience.correct_count", {
              correct: stats.totalCorrect,
              total: stats.totalSubmitted,
              percentage: stats.correctPercentage,
            })}
          </p>
        </Card>
      )}

      <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg animate-pulse inline-block mx-auto">
        <p className="text-xl font-bold flex items-center">
          <Clock className="mr-2" /> {t("player.next_soon")}
        </p>
      </div>
    </div>
  );
};

import React from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../ui/Card";
import Input from "../../ui/Input";
import { FillInTheBlanksPlayer } from "../questions/fillInTheBlanks/FillInTheBlanksPlayer";
import { MatchingPlayer } from "../questions/matching/MatchingPlayer";
import { ChronologyPlayer } from "../questions/chronology/ChronologyPlayer";
import { CrosswordPlayer } from "../questions/crossword/CrosswordPlayer";
import { MultipleChoicePlayer } from "../questions/multipleChoice/MultipleChoicePlayer";
import CorrectTheErrorPlayer from "../questions/correctTheError/CorrectTheErrorPlayer";
import TrueFalsePlayer from "../questions/trueFalse/TrueFalsePlayer";
import type { GameState, FillInTheBlanksContent, MatchingContent, ChronologyContent, CrosswordContent, CorrectTheErrorContent } from "@quizco/shared";

interface QuestionPreviewPhaseProps {
  state: GameState;
}

/**
 * QuestionPreviewPhase component - displays the question before the timer starts.
 * Shows the question text, optional section badge, and type-specific preview content.
 * For MULTIPLE_CHOICE: reveals options one by one based on revealStep.
 * For FILL_IN_THE_BLANKS: shows placeholder dots for blanks (no dropdowns).
 * No timer or submit button is shown - this phase is for the host to read the question.
 */
export const QuestionPreviewPhase: React.FC<QuestionPreviewPhaseProps> = ({ state }) => {
  const { t } = useTranslation();
  const { currentQuestion } = state;

  if (!currentQuestion) return null;

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
      <Card variant="elevated" className="p-10 rounded-3xl border-b-8 border-yellow-500">
        <span className="text-yellow-600 font-black uppercase tracking-widest text-lg mb-4 block">
          {currentQuestion.section
            ? `${t("player.section")} ${currentQuestion.section}, ${t("player.question")} ${currentQuestion.index}`
            : `${t("player.question")} ${currentQuestion.index}`}
        </span>
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
          {currentQuestion.questionText}
        </h2>
      </Card>

      <div className="space-y-6 w-full bg-white p-8 rounded-3xl shadow-xl border-b-8 border-yellow-500">
        {(() => {
          switch (currentQuestion.type) {
            case "MULTIPLE_CHOICE":
              return (
                <MultipleChoicePlayer
                  options={currentQuestion.content.options}
                  selectedIndices={[]}
                  onToggleIndex={() => { }}
                  disabled={true}
                  previewMode={true}
                  revealStep={state.revealStep}
                />
              );
            case "FILL_IN_THE_BLANKS":
              return (
                <FillInTheBlanksPlayer
                  content={currentQuestion.content as FillInTheBlanksContent}
                  value={[]}
                  onChange={() => { }}
                  previewMode={true}
                />
              );
            case "MATCHING":
              return (
                <MatchingPlayer
                  content={currentQuestion.content as MatchingContent}
                  value={{}}
                  onChange={() => { }}
                  previewMode={true}
                />
              );
            case "CHRONOLOGY":
              return (
                <ChronologyPlayer
                  content={currentQuestion.content as ChronologyContent}
                  value={{ slotIds: [], poolIds: (currentQuestion.content as ChronologyContent).items.map(i => i.id) }}
                  onChange={() => { }}
                  previewMode={true}
                />
              );
            case "CROSSWORD":
              return (
                <CrosswordPlayer
                  data={currentQuestion.content as CrosswordContent}
                  previewMode={true}
                />
              );
            case "CORRECT_THE_ERROR":
              return (
                <CorrectTheErrorPlayer
                  content={currentQuestion.content as CorrectTheErrorContent}
                  value={{ selectedPhraseIndex: -1, correction: "" }}
                  onChange={() => { }}
                  previewMode={true}
                />
              );
            case "TRUE_FALSE":
              return (
                <TrueFalsePlayer
                  selectedAnswer={null}
                  onAnswer={() => { }}
                  previewMode={true}
                />
              );
            case "CLOSED":
            case "OPEN_WORD":
              return (
                <Input
                  type="text"
                  value=""
                  readOnly
                  disabled
                  placeholder={t("player.type_answer")}
                  data-testid="player-preview-answer-input"
                  className="text-2xl"
                />
              );
            default:
              return null;
          }
        })()}
      </div>

      {/* Waiting message while host reads the question */}
      <div className="space-y-4">
        <Clock className="w-16 h-16 text-yellow-500 animate-spin-slow mx-auto" />
        <p className="text-2xl font-black text-gray-500 uppercase tracking-widest">
          {t('player.host_reading')}
        </p>
      </div>
    </div>
  );
};

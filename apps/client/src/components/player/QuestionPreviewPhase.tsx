import React from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../ui/Card";
import Badge from "../ui/Badge";
import { FillInTheBlanksPlayer } from "./FillInTheBlanksPlayer";
import { MatchingPlayer } from "./MatchingPlayer";
import { ChronologyPlayer } from "./ChronologyPlayer";
import type { GameState, FillInTheBlanksContent, MatchingContent, ChronologyContent } from "@quizco/shared";

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
      {currentQuestion.section && (
        <Badge variant="yellow" className="p-4 rounded-2xl border-2 border-yellow-400 animate-bounce text-2xl">
          {t('player.turn')}: {currentQuestion.section}
        </Badge>
      )}

      <Card variant="elevated" className="p-10 rounded-3xl border-b-8 border-yellow-500">
        <span className="text-yellow-600 font-black uppercase tracking-widest text-lg mb-4 block">
          {t('player.upcoming_question')}
        </span>
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
          {currentQuestion.questionText}
        </h2>
      </Card>

      {/* MULTIPLE_CHOICE: Show revealed options with animation */}
      {currentQuestion.type === "MULTIPLE_CHOICE" && state.revealStep > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8">
          {currentQuestion.content.options.map((opt: string, i: number) => (
            <div
              key={i}
              className={`p-8 rounded-3xl border-4 transition-all duration-500 transform ${i < state.revealStep
                ? "bg-white border-blue-100 shadow-lg scale-100 opacity-100 translate-y-0"
                : "bg-gray-100 border-transparent opacity-0 translate-y-4 scale-95"
                }`}
            >
              <span className="text-3xl font-black text-gray-800 text-left">{opt}</span>
            </div>
          ))}
        </div>
      )}

      {/* FILL_IN_THE_BLANKS: Show placeholder dots for blanks */}
      {currentQuestion.type === "FILL_IN_THE_BLANKS" && (
        <div className="mt-8">
          <FillInTheBlanksPlayer
            content={currentQuestion.content as FillInTheBlanksContent}
            value={[]}
            onChange={() => { }}
            previewMode={true}
          />
        </div>
      )}

      {/* MATCHING: Show matching UI without interactions */}
      {currentQuestion.type === "MATCHING" && (
        <div className="mt-8">
          <MatchingPlayer
            content={currentQuestion.content as MatchingContent}
            value={{}}
            onChange={() => { }}
            previewMode={true}
          />
        </div>
      )}

      {/* CHRONOLOGY: Show all items in pool for host to read */}
      {currentQuestion.type === "CHRONOLOGY" && (
        <div className="mt-8">
          <ChronologyPlayer
            content={currentQuestion.content as ChronologyContent}
            value={{ slotIds: [], poolIds: (currentQuestion.content as ChronologyContent).items.map(i => i.id) }}
            onChange={() => { }}
            previewMode={true}
          />
        </div>
      )}

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

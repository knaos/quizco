import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../contexts/useGame";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { CompetitionSelector } from "../player/lobby/CompetitionSelector";
import { WaitingPhase, RoundTransitionPhase, LeaderboardPhase } from "../player/phases/SimplePhases";
import { TimerPausedPhase } from "../player/phases/TimerPausedPhase";
import { PublicQuestionPreview } from "../player/PublicQuestionPreview";
import { PublicQuestionBody } from "../player/PublicQuestionBody";
import { AudienceRevealPhase } from "./AudienceRevealPhase";
import { useAudienceSession } from "../../hooks/useAudienceSession";

export const AudienceView: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const session = useAudienceSession(state);

  useEffect(() => {
    document.title = "BC Audience";
  }, []);

  if (!session.selectedCompId) {
    return (
      <CompetitionSelector
        competitions={session.competitions}
        onSelect={session.selectCompetition}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg text-gray-800">{t("audience.title")}</h1>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div data-testid="audience-phase" className="sr-only">
          {state.phase}
        </div>

        {(state.phase === "WAITING" || state.phase === "WELCOME") && <WaitingPhase />}

        {(state.phase === "ROUND_START" || state.phase === "ROUND_END") && (
          <RoundTransitionPhase phase={state.phase} currentQuestion={state.currentQuestion} />
        )}

        {state.phase === "QUESTION_PREVIEW" && state.currentQuestion ? (
          <PublicQuestionPreview state={state} testIdPrefix="audience" />
        ) : null}

        {state.phase === "QUESTION_ACTIVE" && state.timerPaused && (
          <TimerPausedPhase />
        )}

        {state.phase === "QUESTION_ACTIVE" && !state.timerPaused && state.currentQuestion ? (
          <div className="w-full max-w-3xl space-y-8">
            <PublicQuestionBody mode="readOnly" state={state} testIdPrefix="audience" />
          </div>
        ) : null}

        {state.phase === "GRADING" && state.currentQuestion ? (
          <div className="w-full max-w-3xl space-y-8">
            <PublicQuestionBody mode="readOnly" state={state} testIdPrefix="audience" />
            <p className="text-xl text-gray-500">{t("player.grading_waiting")}</p>
          </div>
        ) : null}

        {state.phase === "REVEAL_ANSWER" ? (
          <AudienceRevealPhase state={state} stats={session.stats} />
        ) : null}

        {state.phase === "LEADERBOARD" && <LeaderboardPhase teams={state.teams} />}
      </main>
    </div>
  );
};

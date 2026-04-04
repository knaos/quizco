import React from "react";
import type { Competition } from "@quizco/shared";
import { useTranslation } from "react-i18next";
import { useGame } from "../../contexts/useGame";
import { API_URL, socket } from "../../socket";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { CompetitionSelector } from "../player/lobby/CompetitionSelector";
import { WaitingPhase, RoundTransitionPhase, LeaderboardPhase } from "../player/phases/SimplePhases";
import { PublicQuestionPreview } from "../player/PublicQuestionPreview";
import { PublicQuestionBody } from "../player/PublicQuestionBody";
import { AudienceRevealPhase } from "./AudienceRevealPhase";
import type { AudienceAnswerRecord } from "./audienceStats";
import { buildAudienceAnswerStats } from "./audienceStats";

const AUDIENCE_COMP_ID_KEY = "quizco_audience_competition_id";

function getInitialCompetitionId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("competitionId") || localStorage.getItem(AUDIENCE_COMP_ID_KEY);
}

export const AudienceView: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const [competitions, setCompetitions] = React.useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = React.useState<string | null>(
    getInitialCompetitionId(),
  );
  const [stats, setStats] = React.useState<ReturnType<typeof buildAudienceAnswerStats>>(null);

  React.useEffect(() => {
    document.title = "BC Audience";
  }, []);

  React.useEffect(() => {
    fetch(`${API_URL}/api/competitions`)
      .then((response) => response.json())
      .then((data) => setCompetitions(data));
  }, []);

  React.useEffect(() => {
    if (!selectedCompId) {
      return;
    }

    localStorage.setItem(AUDIENCE_COMP_ID_KEY, selectedCompId);

    const params = new URLSearchParams(window.location.search);
    params.set("competitionId", selectedCompId);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ path: newUrl }, "", newUrl);

    socket.emit("HOST_JOIN_ROOM", { competitionId: selectedCompId });
  }, [selectedCompId]);

  React.useEffect(() => {
    if (
      !selectedCompId ||
      !state.currentQuestion ||
      !["QUESTION_ACTIVE", "GRADING", "REVEAL_ANSWER"].includes(state.phase)
    ) {
      setStats(null);
      return;
    }

    let cancelled = false;

    fetch(
      `${API_URL}/api/competitions/${selectedCompId}/questions/${state.currentQuestion.id}/answers`,
    )
      .then((response) => response.json())
      .then((data: AudienceAnswerRecord[]) => {
        if (!cancelled) {
          setStats(buildAudienceAnswerStats(Array.isArray(data) ? data : []));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCompId, state.currentQuestion, state.phase, state.revealStep, state.teams]);

  if (!selectedCompId) {
    return (
      <CompetitionSelector
        competitions={competitions}
        onSelect={(competitionId) => setSelectedCompId(competitionId)}
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
          <RoundTransitionPhase
            phase={state.phase}
            currentQuestion={state.currentQuestion}
          />
        )}

        {state.phase === "QUESTION_PREVIEW" && state.currentQuestion && (
          <PublicQuestionPreview state={state} testIdPrefix="audience" />
        )}

        {state.phase === "QUESTION_ACTIVE" && state.currentQuestion && (
          <div className="w-full max-w-3xl space-y-8">
            <PublicQuestionBody
              mode="readOnly"
              state={state}
              hasSubmitted={false}
              selectedIndices={[]}
              answer=""
              setAnswer={() => undefined}
              toggleIndex={() => undefined}
              submitAnswer={() => undefined}
              submissionStatus="idle"
              testIdPrefix="audience"
            />
            <div
              className="text-4xl font-black text-gray-300"
              data-testid="audience-time-remaining"
            >
              {state.timeRemaining}s
            </div>
          </div>
        )}

        {state.phase === "GRADING" && state.currentQuestion && (
          <div className="w-full max-w-3xl space-y-8">
            <PublicQuestionBody
              mode="readOnly"
              state={state}
              hasSubmitted={false}
              selectedIndices={[]}
              answer=""
              setAnswer={() => undefined}
              toggleIndex={() => undefined}
              submitAnswer={() => undefined}
              submissionStatus="idle"
              testIdPrefix="audience"
            />
            <p className="text-xl text-gray-500">{t("player.grading_waiting")}</p>
          </div>
        )}

        {state.phase === "REVEAL_ANSWER" && (
          <AudienceRevealPhase state={state} stats={stats} />
        )}

        {state.phase === "LEADERBOARD" && <LeaderboardPhase teams={state.teams} />}
      </main>
    </div>
  );
};

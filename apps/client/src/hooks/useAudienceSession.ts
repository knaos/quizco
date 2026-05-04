import { useEffect, useState } from "react";
import type { Competition, GameState } from "@quizco/shared";
import { API_URL, socket } from "../socket";
import type { AudienceAnswerRecord, AudienceAnswerStats } from "../components/audience/audienceStats";
import { buildAudienceAnswerStats } from "../components/audience/audienceStats";

const AUDIENCE_COMP_ID_KEY = "quizco_audience_competition_id";

function getInitialCompetitionId(): string | null {
  const params = new URLSearchParams(window.location.search);
  const competitionIdFromUrl = params.get("competitionId");
  if (competitionIdFromUrl) {
    return competitionIdFromUrl;
  }

  // Entering /audience should always present the picker unless the competition
  // was explicitly requested through the URL.
  return null;
}

export interface AudienceSessionResult {
  competitions: Competition[];
  selectedCompId: string | null;
  stats: AudienceAnswerStats | null;
  selectCompetition: (competitionId: string) => void;
}

export function useAudienceSession(state: GameState): AudienceSessionResult {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(
    getInitialCompetitionId(),
  );
  const [answerRecords, setAnswerRecords] = useState<AudienceAnswerRecord[]>([]);

  const shouldShowStats =
    Boolean(selectedCompId) &&
    Boolean(state.currentQuestion) &&
    ["QUESTION_ACTIVE", "GRADING", "REVEAL_ANSWER"].includes(state.phase);

  const stats: AudienceAnswerStats | null = shouldShowStats
    ? buildAudienceAnswerStats(answerRecords)
    : null;

  useEffect(() => {
    fetch(`${API_URL}/api/competitions`)
      .then((response) => response.json())
      .then((data) => setCompetitions(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    if (!selectedCompId) {
      return;
    }

    localStorage.setItem(AUDIENCE_COMP_ID_KEY, selectedCompId);
    const params = new URLSearchParams(window.location.search);
    params.set("competitionId", selectedCompId);
    window.history.replaceState(
      { path: `${window.location.pathname}?${params.toString()}` },
      "",
      `${window.location.pathname}?${params.toString()}`,
    );

    socket.emit("PUBLIC_JOIN_ROOM", { competitionId: selectedCompId });
  }, [selectedCompId]);

  useEffect(() => {
    if (!selectedCompId || !state.currentQuestion || !shouldShowStats) {
      return;
    }

    let cancelled = false;

    fetch(
      `${API_URL}/api/competitions/${selectedCompId}/questions/${state.currentQuestion.id}/audience-stats`,
    )
      .then((response) => response.json())
      .then((data: AudienceAnswerRecord[]) => {
        if (!cancelled) {
          setAnswerRecords(Array.isArray(data) ? data : []);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedCompId,
    shouldShowStats,
    state.currentQuestion,
    state.phase,
    state.revealStep,
    state.teams,
  ]);

  return {
    competitions,
    selectedCompId,
    stats,
    selectCompetition: setSelectedCompId,
  };
}

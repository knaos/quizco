import { useEffect, useState } from "react";
import type { Competition, GameState } from "@quizco/shared";
import { API_URL, socket } from "../socket";
import type { AudienceAnswerRecord, AudienceAnswerStats } from "../components/audience/audienceStats";
import { buildAudienceAnswerStats } from "../components/audience/audienceStats";

const AUDIENCE_COMP_ID_KEY = "quizco_audience_competition_id";

function getInitialCompetitionId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("competitionId") || localStorage.getItem(AUDIENCE_COMP_ID_KEY);
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
  const [stats, setStats] = useState<AudienceAnswerStats | null>(null);

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

    socket.emit("HOST_JOIN_ROOM", { competitionId: selectedCompId });
  }, [selectedCompId]);

  useEffect(() => {
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

  return {
    competitions,
    selectedCompId,
    stats,
    selectCompetition: setSelectedCompId,
  };
}

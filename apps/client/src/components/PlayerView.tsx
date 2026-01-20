import React, { useEffect } from "react";
import { useGame } from "../contexts/GameContext";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePlayerSession } from "../hooks/usePlayerSession";
import { CompetitionSelection } from "./player/CompetitionSelection";
import { JoinTeamForm } from "./player/JoinTeamForm";
import { ActiveGameView } from "./player/ActiveGameView";

const TEAM_ID_KEY = "quizco_team_id";

export const PlayerView: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const {
    competitions,
    selectedCompId,
    teamName,
    setTeamName,
    color,
    setColor,
    joined,
    setJoined,
    isReconnecting,
    isJoining,
    handleSelectCompetition,
    handleJoin,
    handleLeave,
    clearSelection,
    resetSession,
  } = usePlayerSession();

  // Watchdog: Sync drift detection
  useEffect(() => {
    if (joined && !isReconnecting && state.teams.length > 0) {
      const teamId = localStorage.getItem(TEAM_ID_KEY);
      // Check if our team ID or Name exists in the server state
      const stillInGame = state.teams.some(
        (t) => t.id === teamId || t.name === teamName
      );

      if (!stillInGame) {
        console.warn("Session drift detected: Team not found in server state.");
        alert(t("player.session_expired"));
        setJoined(false);
        resetSession();
      }
    }
  }, [state.teams, joined, isReconnecting, teamName, t, setJoined, resetSession]);

  // -- Render Phase: Loading --
  if (isReconnecting) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center">
        <div className="text-white font-bold flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span>{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  // -- Render Phase: Select Quiz --
  if (!selectedCompId) {
    return (
      <CompetitionSelection
        competitions={competitions}
        onSelect={handleSelectCompetition}
      />
    );
  }

  // -- Render Phase: Join Team --
  if (!joined) {
    return (
      <JoinTeamForm
        teamName={teamName}
        setTeamName={setTeamName}
        color={color}
        setColor={setColor}
        isJoining={isJoining}
        onJoin={handleJoin}
        onChangeQuiz={clearSelection}
      />
    );
  }

  // -- Render Phase: Active Game --
  // We need to pass teamId. It's stored in localStorage or we can get it from state if we trust name.
  // Ideally we use the ID stored in localStorage as the source of truth for "my identity".
  const currentTeamId = localStorage.getItem(TEAM_ID_KEY) || "";

  return (
    <ActiveGameView
      teamName={teamName}
      color={color}
      onLeave={handleLeave}
      competitionId={selectedCompId}
      teamId={currentTeamId}
    />
  );
};

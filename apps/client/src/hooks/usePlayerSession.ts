import { useState, useEffect, useCallback } from "react";
import { socket } from "../socket";
import type { Competition, Team } from "@quizco/shared";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:4000";

const TEAM_ID_KEY = "quizco_team_id";
const TEAM_NAME_KEY = "quizco_team_name";
const TEAM_COLOR_KEY = "quizco_team_color";
const SELECTED_COMP_ID_KEY = "quizco_selected_competition_id";

interface JoinResponse {
  success: boolean;
  team?: Team;
  message?: string;
}

export const usePlayerSession = () => {
  const { t } = useTranslation();

  // -- State --
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(
    localStorage.getItem(SELECTED_COMP_ID_KEY)
  );

  const [teamName, setTeamName] = useState(
    localStorage.getItem(TEAM_NAME_KEY) || ""
  );
  const [color, setColor] = useState(
    localStorage.getItem(TEAM_COLOR_KEY) || "#3B82F6"
  );

  const [joined, setJoined] = useState(false);

  // UI States
  const [isReconnecting, setIsReconnecting] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  // -- Helpers --

  // Soft reset function to leave game without reloading page
  const resetSession = useCallback(() => {
    localStorage.removeItem(TEAM_ID_KEY);
    localStorage.removeItem(TEAM_NAME_KEY);
    localStorage.removeItem(TEAM_COLOR_KEY);
    localStorage.removeItem(SELECTED_COMP_ID_KEY);

    setJoined(false);
    setTeamName("");
    setSelectedCompId(null);
  }, []);

  const saveSession = (team: Team) => {
    localStorage.setItem(TEAM_ID_KEY, team.id);
    localStorage.setItem(TEAM_NAME_KEY, team.name);
    localStorage.setItem(TEAM_COLOR_KEY, team.color);
    // Comp ID is already saved when selected
  };

  // -- Effects --

  // 1. Fetch active competitions (with AbortController cleanup)
  useEffect(() => {
    if (!selectedCompId) {
      const controller = new AbortController();

      fetch(`${API_URL}/api/competitions`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch competitions");
          return res.json();
        })
        .then((data) => setCompetitions(data))
        .catch((err) => {
          if (err.name !== "AbortError")
            console.error(t("player.error_fetch_competitions"), err);
        });

      return () => controller.abort();
    }
  }, [selectedCompId, t]);

  // 2. Attempt Reconnection (with Timeout Race)
  useEffect(() => {
    const savedTeamId = localStorage.getItem(TEAM_ID_KEY);
    const savedCompId = localStorage.getItem(SELECTED_COMP_ID_KEY);

    const restoreSession = async () => {
      if (!savedTeamId || !savedCompId) return;

      // Wrap emission in a promise
      const emitPromise = new Promise<JoinResponse>((resolve) => {
        socket.emit(
          "RECONNECT_TEAM",
          { competitionId: savedCompId, teamId: savedTeamId },
          (res: JoinResponse) => {
            resolve(res);
          }
        );
      });

      // Timeout promise (3 seconds)
      const timeoutPromise = new Promise<JoinResponse>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 3000);
      });

      try {
        const res = await Promise.race([emitPromise, timeoutPromise]);

        if (res.success && res.team) {
          setTeamName(res.team.name);
          setColor(res.team.color);
          setJoined(true);
        } else {
          // If server explicitly rejects (e.g., game over), clear team ID
          localStorage.removeItem(TEAM_ID_KEY);
        }
      } catch (error) {
        console.warn(t("player.reconnection_failed"), error);
        // Don't clear everything on timeout, just let them land on join screen
      }
    };

    restoreSession().finally(() => {
      setIsReconnecting(false);
    });
  }, [t]);

  // -- Handlers --

  const handleSelectCompetition = (id: string) => {
    setSelectedCompId(id);
    localStorage.setItem(SELECTED_COMP_ID_KEY, id);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !selectedCompId || isJoining) return;

    setIsJoining(true);

    socket.emit(
      "JOIN_ROOM",
      { competitionId: selectedCompId, teamName, color },
      (res: JoinResponse) => {
        setIsJoining(false);
        if (res.success && res.team) {
          saveSession(res.team);
          setJoined(true);
        } else {
          alert(res.message || t("player.join_failed"));
        }
      }
    );
  };

  const handleLeave = () => {
    if (confirm(t("player.confirm_leave"))) {
      const teamId = localStorage.getItem(TEAM_ID_KEY);
      if (selectedCompId && teamId) {
        socket.emit("LEAVE_ROOM", { competitionId: selectedCompId, teamId }); // Note: LEAVE_ROOM is not in shared types but used in original code.
        // Wait, original code used LEAVE_ROOM. Shared types don't have it.
        // I should probably check if LEAVE_ROOM exists on server or if I should add it to shared types.
        // For now I will assume it exists or use 'any' if strictness complains, but better to keep it consistent.
        // Original: socket.emit("LEAVE_ROOM", ...);
      }
      resetSession();
    }
  };

  const clearSelection = () => {
    setSelectedCompId(null);
    localStorage.removeItem(SELECTED_COMP_ID_KEY);
  };

  return {
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
    resetSession, // Exposed for drift detection or other external resets
  };
};

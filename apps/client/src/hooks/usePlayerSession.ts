import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnswerContent,
  Competition,
  CorrectTheErrorAnswer,
  CorrectTheErrorContent,
  GameState,
  MultipleChoiceContent,
  Team,
} from "@quizco/shared";
import type { TFunction } from "i18next";
import { socket, API_URL } from "../socket";
import { getHydratedPlayerAnswerState } from "../components/player/utils/playerAnswerSync";
import { useCorrectTheErrorPartialScore } from "../components/player/questions/correctTheError/useCorrectTheErrorPartialScore";
import { getQuestionCorrectAnswer } from "../components/player/questionText";

const TEAM_ID_KEY = "quizco_team_id";
const TEAM_NAME_KEY = "quizco_team_name";
const TEAM_COLOR_KEY = "quizco_team_color";
const SELECTED_COMP_ID_KEY = "quizco_selected_competition_id";

export interface PlayerIdentity {
  teamId: string | null;
  teamName: string;
  color: string;
}

export interface PlayerSessionResult {
  competitions: Competition[];
  selectedCompId: string | null;
  joined: boolean;
  isReconnecting: boolean;
  identity: PlayerIdentity;
  answer: AnswerContent;
  selectedIndices: number[];
  submissionStatus: "idle" | "success" | "error";
  currentTeam: Team | undefined;
  hasSubmitted: boolean;
  correctTheErrorPartialScore: number;
  loginError: string | null;
  currentScore: number;
  setTeamName: (teamName: string) => void;
  setColor: (color: string) => void;
  setAnswer: (value: AnswerContent) => void;
  selectCompetition: (competitionId: string) => void;
  clearSelectedCompetition: () => void;
  joinTeam: () => void;
  leaveSession: () => void;
  toggleIndex: (index: number) => void;
  submitAnswer: (value: AnswerContent, isFinal?: boolean) => void;
  getCorrectAnswer: (
    question: NonNullable<GameState["currentQuestion"]>,
    t: TFunction,
  ) => string;
  getGradingStatus: () => boolean | undefined;
  requestJoker: () => void;
}

export function usePlayerSession(state: GameState): PlayerSessionResult {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(
    localStorage.getItem(SELECTED_COMP_ID_KEY),
  );
  const [teamId, setTeamId] = useState<string | null>(
    localStorage.getItem(TEAM_ID_KEY),
  );
  const [teamName, setTeamName] = useState(localStorage.getItem(TEAM_NAME_KEY) || "");
  const [color, setColor] = useState(localStorage.getItem(TEAM_COLOR_KEY) || "#3B82F6");
  const [joined, setJoined] = useState(false);
  const [answer, setAnswer] = useState<AnswerContent>("");
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success" | "error">("idle");
  const [isReconnecting, setIsReconnecting] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const lastQuestionIdRef = useRef<string | null>(null);
  const lastPartialSubmissionKeyRef = useRef<string | null>(null);

  const currentTeam = useMemo(() => {
    if (!teamId) {
      return undefined;
    }
    return state.teams.find((candidate) => candidate.id === teamId);
  }, [state.teams, teamId]);

  const correctTheErrorContent =
    state.currentQuestion?.type === "CORRECT_THE_ERROR"
      ? (state.currentQuestion.content as CorrectTheErrorContent)
      : null;
  const correctTheErrorPartialScore = useCorrectTheErrorPartialScore(
    correctTheErrorContent,
    (currentTeam?.lastAnswer as CorrectTheErrorAnswer | null) ?? null,
  );

  useEffect(() => {
    if (!selectedCompId) {
      fetch(`${API_URL}/api/competitions`)
        .then((response) => response.json())
        .then((data) => setCompetitions(Array.isArray(data) ? data : []));
    }
  }, [selectedCompId]);

  useEffect(() => {
    const savedTeamId = localStorage.getItem(TEAM_ID_KEY);
    const savedCompId = localStorage.getItem(SELECTED_COMP_ID_KEY);

    if (!savedTeamId || !savedCompId) {
      setIsReconnecting(false);
      return;
    }

    socket.emit(
      "RECONNECT_TEAM",
      { competitionId: savedCompId, teamId: savedTeamId },
      (response: { success: boolean; team: { id?: string; name: string; color: string } }) => {
        if (response.success) {
          const resolvedTeamId = response.team.id ?? savedTeamId;
          setTeamId(resolvedTeamId);
          setTeamName(response.team.name);
          setColor(response.team.color);
          setJoined(true);
          localStorage.setItem(TEAM_ID_KEY, resolvedTeamId);
          localStorage.setItem(TEAM_NAME_KEY, response.team.name);
          localStorage.setItem(TEAM_COLOR_KEY, response.team.color);
        } else {
          localStorage.removeItem(TEAM_ID_KEY);
        }
        setIsReconnecting(false);
      },
    );
  }, []);

  useEffect(() => {
    if (state.currentQuestion && state.currentQuestion.id !== lastQuestionIdRef.current) {
      lastQuestionIdRef.current = state.currentQuestion.id;
      lastPartialSubmissionKeyRef.current = null;
      const hydrated = getHydratedPlayerAnswerState(
        state.currentQuestion,
        currentTeam?.lastAnswer,
      );
      setSelectedIndices(hydrated.selectedIndices);
      setAnswer(hydrated.answer as AnswerContent);
      setSubmissionStatus("idle");
    }
  }, [state.currentQuestion, currentTeam?.lastAnswer]);

  useEffect(() => {
    if (!teamId || state.currentQuestion?.type !== "CROSSWORD") {
      return undefined;
    }

    const handleJokerReveal = (payload: {
      questionId: string;
      teamId: string;
      letter: string;
      x: number;
      y: number;
    }) => {
      if (payload.teamId !== teamId || payload.questionId !== state.currentQuestion?.id) {
        return;
      }

      setAnswer((previousAnswer) => {
        const currentQuestion = state.currentQuestion;
        if (!currentQuestion) {
          return previousAnswer;
        }
        const hydrated = getHydratedPlayerAnswerState(currentQuestion, previousAnswer);
        const grid = Array.isArray(hydrated.answer)
          ? (hydrated.answer as string[][]).map((row) => [...row])
          : [];

        if (grid[payload.y]?.[payload.x] !== undefined) {
          grid[payload.y][payload.x] = payload.letter.toUpperCase();
        }

        return grid;
      });
    };

    socket.on("JOKER_REVEAL", handleJokerReveal);
    return () => {
      socket.off("JOKER_REVEAL", handleJokerReveal);
    };
  }, [state.currentQuestion, teamId]);

  useEffect(() => {
    if (!joined || !teamId || state.phase !== "QUESTION_ACTIVE" || currentTeam?.isExplicitlySubmitted) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (state.currentQuestion?.type !== "MULTIPLE_CHOICE" && answer !== "" && answer !== null && answer !== undefined) {
        socket.emit("SUBMIT_ANSWER", {
          competitionId: selectedCompId,
          teamId,
          questionId: state.currentQuestion?.id,
          answer,
          isFinal: false,
        });
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    answer,
    currentTeam?.isExplicitlySubmitted,
    joined,
    selectedCompId,
    state.currentQuestion,
    state.phase,
    teamId,
  ]);

  const selectCompetition = useCallback((competitionId: string) => {
    setSelectedCompId(competitionId);
    localStorage.setItem(SELECTED_COMP_ID_KEY, competitionId);
  }, []);

  const clearSelectedCompetition = useCallback(() => {
    setSelectedCompId(null);
    localStorage.removeItem(SELECTED_COMP_ID_KEY);
  }, []);

  const joinTeam = useCallback(() => {
    if (!teamName || !selectedCompId) {
      return;
    }

    socket.emit(
      "JOIN_ROOM",
      { competitionId: selectedCompId, teamName, color },
      (response: { success: boolean; team: { id: string; name: string; color: string } }) => {
        if (!response.success) {
          return;
        }

        setTeamId(response.team.id);
        setTeamName(response.team.name);
        setColor(response.team.color);
        setJoined(true);
        setLoginError(null);
        localStorage.setItem(TEAM_ID_KEY, response.team.id);
        localStorage.setItem(TEAM_NAME_KEY, response.team.name);
        localStorage.setItem(TEAM_COLOR_KEY, response.team.color);
      },
    );
  }, [color, selectedCompId, teamName]);

  const leaveSession = useCallback(() => {
    localStorage.removeItem(TEAM_ID_KEY);
    localStorage.removeItem(TEAM_NAME_KEY);
    localStorage.removeItem(TEAM_COLOR_KEY);
    localStorage.removeItem(SELECTED_COMP_ID_KEY);
    setTeamId(null);
    setJoined(false);
    setTeamName("");
    setAnswer("");
    setSelectedIndices([]);
    setSubmissionStatus("idle");
    setSelectedCompId(null);
  }, []);

  const submitAnswer = useCallback(
    (value: AnswerContent, isFinal = false) => {
      if (!state.currentQuestion || !selectedCompId || !teamId) {
        setLoginError("player.session_lost_rejoin");
        setJoined(false);
        return;
      }

      if (!isFinal) {
        const partialKey = `${state.currentQuestion.id}:${JSON.stringify(value)}`;
        if (partialKey === lastPartialSubmissionKeyRef.current) {
          return;
        }
        lastPartialSubmissionKeyRef.current = partialKey;
      }

      socket.emit(
        "SUBMIT_ANSWER",
        {
          competitionId: selectedCompId,
          teamId,
          questionId: state.currentQuestion.id,
          answer: value,
          isFinal,
        },
        (response?: { success: boolean }) => {
          if (!isFinal) {
            return;
          }
          setSubmissionStatus(response?.success ? "success" : "error");
        },
      );
    },
    [selectedCompId, state.currentQuestion, teamId],
  );

  const toggleIndex = useCallback(
    (index: number) => {
      if (currentTeam?.isExplicitlySubmitted) {
        return;
      }

      const currentQuestion = state.currentQuestion;
      const isMultipleChoice = currentQuestion?.type === "MULTIPLE_CHOICE";
      const content = currentQuestion?.content as MultipleChoiceContent | undefined;
      const isSingleChoice = isMultipleChoice && content?.correctIndices?.length === 1;

      let nextIndices: number[];
      if (selectedIndices.includes(index)) {
        nextIndices = selectedIndices.filter((existingIndex) => existingIndex !== index);
      } else if (isSingleChoice) {
        nextIndices = [index];
      } else {
        nextIndices = [...selectedIndices, index];
      }

      setSelectedIndices(nextIndices);
      setAnswer(nextIndices);
      submitAnswer(nextIndices, false);
    },
    [currentTeam?.isExplicitlySubmitted, selectedIndices, state.currentQuestion, submitAnswer],
  );

  const getGradingStatus = useCallback(() => {
    return currentTeam?.lastAnswerCorrect ?? undefined;
  }, [currentTeam]);

  const requestJoker = useCallback(() => {
    if (!teamId || !selectedCompId || !state.currentQuestion) {
      return;
    }

    socket.emit("REQUEST_JOKER", {
      competitionId: selectedCompId,
      teamId,
      questionId: state.currentQuestion.id,
    });
  }, [selectedCompId, state.currentQuestion, teamId]);

  return {
    competitions,
    selectedCompId,
    joined,
    isReconnecting,
    identity: { teamId, teamName, color },
    answer,
    selectedIndices,
    submissionStatus,
    currentTeam,
    hasSubmitted: currentTeam?.isExplicitlySubmitted ?? false,
    correctTheErrorPartialScore,
    loginError,
    currentScore: currentTeam?.score ?? 0,
    setTeamName,
    setColor,
    setAnswer,
    selectCompetition,
    clearSelectedCompetition,
    joinTeam,
    leaveSession,
    toggleIndex,
    submitAnswer,
    getCorrectAnswer: getQuestionCorrectAnswer,
    getGradingStatus,
    requestJoker,
  };
}

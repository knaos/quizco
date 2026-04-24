import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
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
import {
  clearPendingFinalSubmission,
  getPendingFinalSubmission,
  isSameAnswer,
  setPendingFinalSubmission,
} from "./playerPendingSubmission";

const TEAM_ID_KEY = "quizco_team_id";
const TEAM_NAME_KEY = "quizco_team_name";
const TEAM_COLOR_KEY = "quizco_team_color";
const SELECTED_COMP_ID_KEY = "quizco_selected_competition_id";
const DEFAULT_PLAYER_COLOR = "#3B82F6";

interface PersistedPlayerSession {
  teamId: string | null;
  teamName: string;
  color: string;
  selectedCompetitionId: string | null;
}

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

interface DraftAnswerState {
  questionId: string | null;
  answer: AnswerContent;
  selectedIndices: number[];
  submissionStatus: "idle" | "success" | "error";
}

interface PendingJoinRequest {
  competitionId: string;
  teamName: string;
  color: string;
}

/**
 * Groups the mutable, client-only session state so semantic events can update
 * it through a single transition boundary instead of multiple ad hoc setters.
 */
interface PlayerSessionState {
  teamId: string | null;
  teamName: string;
  color: string;
  joinedState: boolean;
  isReconnecting: boolean;
  loginError: string | null;
  reconnectAttempt: number;
  pendingJoinRequest: PendingJoinRequest | null;
  draftState: DraftAnswerState;
}

type PlayerSessionAction =
  | { type: "set-team-name"; teamName: string }
  | { type: "set-color"; color: string }
  | { type: "select-competition" }
  | { type: "clear-selected-competition" }
  | { type: "join-requested"; request: PendingJoinRequest }
  | {
      type: "join-succeeded";
      team: { id: string; name: string; color: string };
    }
  | { type: "join-failed" }
  | {
      type: "reconnect-succeeded";
      team: { id: string; name: string; color: string };
    }
  | { type: "reconnect-failed" }
  | { type: "finish-initial-reconnect" }
  | { type: "connection-reestablished" }
  | { type: "set-login-error"; error: string | null }
  | { type: "leave-session" }
  | { type: "replace-draft"; draftState: DraftAnswerState }
  | {
      type: "update-draft";
      updater: (previous: DraftAnswerState) => DraftAnswerState;
    };

/**
 * Resets answer-local state when a new question arrives or the user leaves the
 * session.
 */
function createEmptyDraftState(): DraftAnswerState {
  return {
    questionId: null,
    answer: "",
    selectedIndices: [],
    submissionStatus: "idle",
  };
}

function readPersistedPlayerSession(): PersistedPlayerSession {
  return {
    teamId: localStorage.getItem(TEAM_ID_KEY),
    teamName: localStorage.getItem(TEAM_NAME_KEY) || "",
    color: localStorage.getItem(TEAM_COLOR_KEY) || DEFAULT_PLAYER_COLOR,
    selectedCompetitionId: localStorage.getItem(SELECTED_COMP_ID_KEY),
  };
}

function persistPlayerSession(session: PersistedPlayerSession): void {
  if (session.teamId) {
    localStorage.setItem(TEAM_ID_KEY, session.teamId);
    localStorage.setItem(TEAM_NAME_KEY, session.teamName);
    localStorage.setItem(TEAM_COLOR_KEY, session.color);
    if (session.selectedCompetitionId) {
      localStorage.setItem(SELECTED_COMP_ID_KEY, session.selectedCompetitionId);
    } else {
      localStorage.removeItem(SELECTED_COMP_ID_KEY);
    }
    return;
  }

  localStorage.removeItem(TEAM_ID_KEY);
  localStorage.removeItem(TEAM_NAME_KEY);
  localStorage.removeItem(TEAM_COLOR_KEY);
  localStorage.removeItem(SELECTED_COMP_ID_KEY);
}

function clearPersistedPlayerSession(): void {
  localStorage.removeItem(TEAM_ID_KEY);
  localStorage.removeItem(TEAM_NAME_KEY);
  localStorage.removeItem(TEAM_COLOR_KEY);
  localStorage.removeItem(SELECTED_COMP_ID_KEY);
}

/**
 * Rehydrates the reducer from localStorage so reconnects start from persisted
 * identity rather than a blank client session.
 */
function createInitialPlayerSessionState(
  saved: PersistedPlayerSession,
): PlayerSessionState {
  return {
    teamId: saved.teamId,
    teamName: saved.teamName,
    color: saved.color,
    joinedState: false,
    isReconnecting: Boolean(saved.teamId && saved.selectedCompetitionId),
    loginError: null,
    reconnectAttempt: 0,
    pendingJoinRequest: null,
    draftState: createEmptyDraftState(),
  };
}

/**
 * Encodes the session transitions explicitly so socket callbacks stay readable
 * and local state changes remain easy to audit.
 */
function playerSessionReducer(
  state: PlayerSessionState,
  action: PlayerSessionAction,
): PlayerSessionState {
  switch (action.type) {
    case "set-team-name":
      return {
        ...state,
        teamName: action.teamName,
      };
    case "set-color":
      return {
        ...state,
        color: action.color,
      };
    case "select-competition":
      return {
        ...state,
        loginError: null,
      };
    case "clear-selected-competition":
      return {
        ...state,
        pendingJoinRequest: null,
      };
    case "join-requested":
      return {
        ...state,
        pendingJoinRequest: action.request,
        loginError: null,
      };
    case "join-succeeded":
    case "reconnect-succeeded":
      return {
        ...state,
        teamId: action.team.id,
        teamName: action.team.name,
        color: action.team.color,
        joinedState: true,
        loginError: null,
        pendingJoinRequest: null,
      };
    case "join-failed":
      return {
        ...state,
        pendingJoinRequest: null,
      };
    case "reconnect-failed":
      return {
        ...state,
        teamId: null,
        teamName: "",
        color: DEFAULT_PLAYER_COLOR,
        joinedState: false,
        isReconnecting: false,
        loginError: null,
        pendingJoinRequest: null,
        draftState: createEmptyDraftState(),
      };
    case "finish-initial-reconnect":
      return {
        ...state,
        isReconnecting: false,
      };
    case "connection-reestablished":
      return {
        ...state,
        reconnectAttempt: state.reconnectAttempt + 1,
      };
    case "set-login-error":
      return {
        ...state,
        loginError: action.error,
      };
    case "leave-session":
      return {
        ...state,
        teamId: null,
        teamName: "",
        color: DEFAULT_PLAYER_COLOR,
        joinedState: false,
        isReconnecting: false,
        loginError: null,
        pendingJoinRequest: null,
        reconnectAttempt: 0,
        draftState: createEmptyDraftState(),
      };
    case "replace-draft":
      return {
        ...state,
        draftState: action.draftState,
      };
    case "update-draft":
      return {
        ...state,
        draftState: action.updater(state.draftState),
      };
    default:
      return state;
  }
}

export function usePlayerSession(state: GameState): PlayerSessionResult {
  const [persistedSession] = useState(readPersistedPlayerSession);
  const persistedSessionRef = useRef(persistedSession);

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(
    persistedSession.selectedCompetitionId,
  );
  const [sessionState, dispatch] = useReducer(
    playerSessionReducer,
    {
      teamId: persistedSession.teamId,
      teamName: persistedSession.teamName,
      color: persistedSession.color,
      selectedCompetitionId: persistedSession.selectedCompetitionId,
    },
    createInitialPlayerSessionState,
  );

  const lastPartialSubmissionKeyRef = useRef<string | null>(null);
  const lastPendingReplayKeyRef = useRef<string | null>(null);

  const {
    teamId,
    teamName,
    color,
    joinedState,
    isReconnecting,
    loginError,
    pendingJoinRequest,
    draftState,
  } = sessionState;

  const matchedPendingJoinTeam = useMemo(() => {
    if (teamId || !selectedCompId) {
      return undefined;
    }

    if (
      !pendingJoinRequest ||
      pendingJoinRequest.competitionId !== selectedCompId
    ) {
      return undefined;
    }

    return state.teams.find(
      (candidate) =>
        candidate.name === pendingJoinRequest.teamName &&
        candidate.color === pendingJoinRequest.color,
    );
  }, [pendingJoinRequest, selectedCompId, state.teams, teamId]);

  const resolvedTeamId = teamId ?? matchedPendingJoinTeam?.id ?? null;

  const currentTeam = useMemo(() => {
    if (!resolvedTeamId) {
      return undefined;
    }
    return state.teams.find((candidate) => candidate.id === resolvedTeamId);
  }, [resolvedTeamId, state.teams]);

  const joined = joinedState || Boolean(resolvedTeamId && currentTeam);

  const correctTheErrorContent =
    state.currentQuestion?.type === "CORRECT_THE_ERROR"
      ? (state.currentQuestion.content as CorrectTheErrorContent)
      : null;
  const correctTheErrorPartialScore = useCorrectTheErrorPartialScore(
    correctTheErrorContent,
    (currentTeam?.lastAnswer as CorrectTheErrorAnswer | null) ?? null,
  );
  const currentQuestionId = state.currentQuestion?.id ?? null;
  const hydratedState = useMemo<DraftAnswerState>(() => {
    if (!state.currentQuestion) {
      return {
        questionId: null,
        answer: "",
        selectedIndices: [],
        submissionStatus: "idle",
      };
    }

    const hydrated = getHydratedPlayerAnswerState(
      state.currentQuestion,
      currentTeam?.lastAnswer,
    );

    return {
      questionId: state.currentQuestion.id,
      answer: hydrated.answer as AnswerContent,
      selectedIndices: hydrated.selectedIndices,
      submissionStatus: "idle",
    };
  }, [currentTeam?.lastAnswer, state.currentQuestion]);
  const isDraftCurrentQuestion = draftState.questionId === currentQuestionId;
  const answer = isDraftCurrentQuestion
    ? draftState.answer
    : hydratedState.answer;
  const selectedIndices = isDraftCurrentQuestion
    ? draftState.selectedIndices
    : hydratedState.selectedIndices;
  const submissionStatus = isDraftCurrentQuestion
    ? draftState.submissionStatus
    : hydratedState.submissionStatus;

  useEffect(() => {
    if (!selectedCompId) {
      fetch(`${API_URL}/api/competitions`)
        .then((response) => response.json())
        .then((data) => setCompetitions(Array.isArray(data) ? data : []));
    }
  }, [selectedCompId]);

  const persistJoinedTeam = useCallback(
    (
      competitionId: string,
      joinedTeam: { id: string; name: string; color: string },
    ) => {
      const nextPersistedSession: PersistedPlayerSession = {
        teamId: joinedTeam.id,
        teamName: joinedTeam.name,
        color: joinedTeam.color,
        selectedCompetitionId: competitionId,
      };
      persistedSessionRef.current = nextPersistedSession;
      persistPlayerSession(nextPersistedSession);
      dispatch({ type: "join-succeeded", team: joinedTeam });
      setSelectedCompId(competitionId);
    },
    [],
  );

  const clearPersistedIdentity = useCallback(() => {
    persistedSessionRef.current = {
      teamId: null,
      teamName: "",
      color: DEFAULT_PLAYER_COLOR,
      selectedCompetitionId: null,
    };
    clearPersistedPlayerSession();
  }, []);

  const reconnectTeam = useCallback(
    (
      competitionId: string,
      reconnectingTeamId: string,
      isInitialAttempt: boolean,
    ) => {
      socket.emit(
        "RECONNECT_TEAM",
        { competitionId, teamId: reconnectingTeamId },
        (
          response?: {
            success: boolean;
            team: { id?: string; name: string; color: string };
          } | null,
        ) => {
          if (response?.success) {
            const resolvedTeamId = response.team.id ?? reconnectingTeamId;
            const nextPersistedSession: PersistedPlayerSession = {
              teamId: resolvedTeamId,
              teamName: response.team.name,
              color: response.team.color,
              selectedCompetitionId: competitionId,
            };
            persistedSessionRef.current = nextPersistedSession;
            persistPlayerSession(nextPersistedSession);
            dispatch({
              type: "reconnect-succeeded",
              team: {
                id: resolvedTeamId,
                name: response.team.name,
                color: response.team.color,
              },
            });
            setSelectedCompId(competitionId);
          } else if (response) {
            clearPersistedIdentity();
            clearPendingFinalSubmission();
            dispatch({ type: "reconnect-failed" });
            setSelectedCompId(null);
          }

          if (isInitialAttempt) {
            dispatch({ type: "finish-initial-reconnect" });
          }
        },
      );
    },
    [clearPersistedIdentity],
  );

  useEffect(() => {
    const initialPersistedSession = persistedSessionRef.current;
    if (
      !initialPersistedSession.teamId ||
      !initialPersistedSession.selectedCompetitionId
    ) {
      return;
    }

    reconnectTeam(
      initialPersistedSession.selectedCompetitionId,
      initialPersistedSession.teamId,
      true,
    );
  }, [reconnectTeam]);

  useEffect(() => {
    const handleConnect = () => {
      const persistedSession = persistedSessionRef.current;
      const reconnectCompetitionId =
        selectedCompId ?? persistedSession.selectedCompetitionId;
      const reconnectingTeamId = resolvedTeamId ?? persistedSession.teamId;
      if (!reconnectingTeamId || !reconnectCompetitionId) {
        return;
      }

      lastPendingReplayKeyRef.current = null;
      reconnectTeam(reconnectCompetitionId, reconnectingTeamId, false);
      dispatch({ type: "connection-reestablished" });
    };

    socket.on("connect", handleConnect);
    return () => {
      socket.off("connect", handleConnect);
    };
  }, [reconnectTeam, resolvedTeamId, selectedCompId]);

  useEffect(() => {
    lastPartialSubmissionKeyRef.current = null;
  }, [currentQuestionId]);

  useEffect(() => {
    if (!matchedPendingJoinTeam || teamId || !selectedCompId) {
      return;
    }

    persistedSessionRef.current = {
      teamId: matchedPendingJoinTeam.id,
      teamName: matchedPendingJoinTeam.name,
      color: matchedPendingJoinTeam.color,
      selectedCompetitionId: selectedCompId,
    };
    persistPlayerSession(persistedSessionRef.current);
  }, [matchedPendingJoinTeam, selectedCompId, teamId]);

  useEffect(() => {
    const pendingSubmission = getPendingFinalSubmission();
    if (!pendingSubmission) {
      lastPendingReplayKeyRef.current = null;
      return;
    }

    const sameTeam =
      pendingSubmission.competitionId === selectedCompId &&
      pendingSubmission.teamId === resolvedTeamId;
    if (!sameTeam) {
      return;
    }

    if (isReconnecting || !state.currentQuestion) {
      return;
    }

    if (
      currentQuestionId === pendingSubmission.questionId &&
      currentTeam?.isExplicitlySubmitted &&
      isSameAnswer(currentTeam.lastAnswer, pendingSubmission.answer)
    ) {
      clearPendingFinalSubmission();
      lastPendingReplayKeyRef.current = null;
      return;
    }

    if (
      currentQuestionId !== pendingSubmission.questionId ||
      state.phase !== "QUESTION_ACTIVE"
    ) {
      clearPendingFinalSubmission();
      lastPendingReplayKeyRef.current = null;
    }
  }, [
    currentQuestionId,
    currentTeam?.isExplicitlySubmitted,
    currentTeam?.lastAnswer,
    isReconnecting,
    resolvedTeamId,
    selectedCompId,
    state.currentQuestion,
    state.phase,
  ]);

  const replayPendingFinalSubmission = useCallback(() => {
    const pendingSubmission = getPendingFinalSubmission();
    if (!pendingSubmission) {
      lastPendingReplayKeyRef.current = null;
      return;
    }

    if (
      !socket.connected ||
      !selectedCompId ||
      !resolvedTeamId ||
      !state.currentQuestion ||
      !joined
    ) {
      return;
    }

    if (
      pendingSubmission.competitionId !== selectedCompId ||
      pendingSubmission.teamId !== resolvedTeamId ||
      pendingSubmission.questionId !== state.currentQuestion.id ||
      state.phase !== "QUESTION_ACTIVE" ||
      currentTeam?.isExplicitlySubmitted
    ) {
      if (
        currentQuestionId !== pendingSubmission.questionId ||
        state.phase !== "QUESTION_ACTIVE"
      ) {
        clearPendingFinalSubmission();
        lastPendingReplayKeyRef.current = null;
      }
      return;
    }

    const replayKey = JSON.stringify(pendingSubmission);
    if (lastPendingReplayKeyRef.current === replayKey) {
      return;
    }
    lastPendingReplayKeyRef.current = replayKey;

    socket.emit(
      "SUBMIT_ANSWER",
      {
        competitionId: pendingSubmission.competitionId,
        teamId: pendingSubmission.teamId,
        questionId: pendingSubmission.questionId,
        answer: pendingSubmission.answer,
        isFinal: true,
      },
      (response?: { success: boolean; error?: string }) => {
        if (response?.success) {
          clearPendingFinalSubmission();
          lastPendingReplayKeyRef.current = null;
          dispatch({
            type: "update-draft",
            updater: (previous) => ({
              ...previous,
              submissionStatus: "success",
            }),
          });
          return;
        }

        if (
          response?.error === "INVALID_PHASE" ||
          response?.error === "QUESTION_MISMATCH"
        ) {
          clearPendingFinalSubmission();
          lastPendingReplayKeyRef.current = null;
          dispatch({
            type: "update-draft",
            updater: (previous) => ({
              ...previous,
              submissionStatus: "error",
            }),
          });
        }
      },
    );
  }, [
    currentQuestionId,
    currentTeam?.isExplicitlySubmitted,
    joined,
    resolvedTeamId,
    selectedCompId,
    state.currentQuestion,
    state.phase,
  ]);

  useEffect(() => {
    replayPendingFinalSubmission();
  }, [replayPendingFinalSubmission]);

  useEffect(() => {
    const handleOnline = () => {
      if (!socket.connected) {
        return;
      }

      // Browser offline mode can drop packets without forcing an immediate
      // Socket.IO reconnect, so replay persisted final answers here as well.
      lastPendingReplayKeyRef.current = null;
      replayPendingFinalSubmission();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [replayPendingFinalSubmission]);

  useEffect(() => {
    if (!resolvedTeamId || state.currentQuestion?.type !== "CROSSWORD") {
      return undefined;
    }

    const handleJokerReveal = (payload: {
      questionId: string;
      teamId: string;
      letter: string;
      x: number;
      y: number;
    }) => {
      if (
        payload.teamId !== resolvedTeamId ||
        payload.questionId !== state.currentQuestion?.id
      ) {
        return;
      }

      dispatch({
        type: "update-draft",
        updater: (previous) => {
          const currentQuestion = state.currentQuestion;
          if (!currentQuestion) {
            return previous;
          }
          const baseAnswer =
            previous.questionId === currentQuestion.id
              ? previous.answer
              : hydratedState.answer;
          const hydrated = getHydratedPlayerAnswerState(
            currentQuestion,
            baseAnswer,
          );
          const grid = Array.isArray(hydrated.answer)
            ? (hydrated.answer as string[][]).map((row) => [...row])
            : [];

          if (grid[payload.y]?.[payload.x] !== undefined) {
            grid[payload.y][payload.x] = payload.letter.toUpperCase();
          }

          return {
            questionId: currentQuestion.id,
            answer: grid,
            selectedIndices:
              previous.questionId === currentQuestion.id
                ? previous.selectedIndices
                : hydratedState.selectedIndices,
            submissionStatus: "idle",
          };
        },
      });
    };

    socket.on("JOKER_REVEAL", handleJokerReveal);
    return () => {
      socket.off("JOKER_REVEAL", handleJokerReveal);
    };
  }, [
    hydratedState.answer,
    hydratedState.selectedIndices,
    resolvedTeamId,
    state.currentQuestion,
  ]);

  useEffect(() => {
    if (
      !joined ||
      !resolvedTeamId ||
      state.phase !== "QUESTION_ACTIVE" ||
      currentTeam?.isExplicitlySubmitted
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (
        state.currentQuestion?.type !== "MULTIPLE_CHOICE" &&
        answer !== "" &&
        answer !== null &&
        answer !== undefined
      ) {
        socket.emit("SUBMIT_ANSWER", {
          competitionId: selectedCompId,
          teamId: resolvedTeamId,
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
    resolvedTeamId,
    selectedCompId,
    state.currentQuestion,
    state.phase,
  ]);

  const selectCompetition = useCallback((competitionId: string) => {
    dispatch({ type: "select-competition" });
    setSelectedCompId(competitionId);
    persistedSessionRef.current = {
      ...persistedSessionRef.current,
      selectedCompetitionId: competitionId,
    };
    localStorage.setItem(SELECTED_COMP_ID_KEY, competitionId);
  }, []);

  const clearSelectedCompetition = useCallback(() => {
    dispatch({ type: "clear-selected-competition" });
    setSelectedCompId(null);
    persistedSessionRef.current = {
      ...persistedSessionRef.current,
      selectedCompetitionId: null,
    };
    localStorage.removeItem(SELECTED_COMP_ID_KEY);
  }, []);

  const joinTeam = useCallback(() => {
    if (!teamName || !selectedCompId) {
      return;
    }

    dispatch({
      type: "join-requested",
      request: {
        competitionId: selectedCompId,
        teamName,
        color,
      },
    });

    socket.emit(
      "JOIN_ROOM",
      { competitionId: selectedCompId, teamName, color },
      (
        response?: {
          success: boolean;
          team: { id: string; name: string; color: string };
        } | null,
      ) => {
        if (!response) {
          return;
        }

        if (!response.success) {
          dispatch({ type: "join-failed" });
          return;
        }

        persistJoinedTeam(selectedCompId, response.team);
      },
    );
  }, [color, persistJoinedTeam, selectedCompId, teamName]);

  const leaveSession = useCallback(() => {
    clearPersistedIdentity();
    clearPendingFinalSubmission();
    dispatch({ type: "leave-session" });
    setSelectedCompId(null);
  }, [clearPersistedIdentity]);

  const submitAnswer = useCallback(
    (value: AnswerContent, isFinal = false) => {
      if (!state.currentQuestion || !selectedCompId || !resolvedTeamId) {
        dispatch({
          type: "set-login-error",
          error: "player.session_lost_rejoin",
        });
        dispatch({ type: "reconnect-failed" });
        return;
      }

      if (!isFinal) {
        const partialKey = `${state.currentQuestion.id}:${JSON.stringify(value)}`;
        if (partialKey === lastPartialSubmissionKeyRef.current) {
          return;
        }
        lastPartialSubmissionKeyRef.current = partialKey;
      }

      if (isFinal) {
        setPendingFinalSubmission({
          competitionId: selectedCompId,
          teamId: resolvedTeamId,
          questionId: state.currentQuestion.id,
          answer: value,
        });
        lastPendingReplayKeyRef.current = null;
        if (!socket.connected) {
          return;
        }
      }

      socket.emit(
        "SUBMIT_ANSWER",
        {
          competitionId: selectedCompId,
          teamId: resolvedTeamId,
          questionId: state.currentQuestion.id,
          answer: value,
          isFinal,
        },
        (response?: { success: boolean; error?: string }) => {
          if (!isFinal) {
            return;
          }
          if (response?.success) {
            clearPendingFinalSubmission();
            lastPendingReplayKeyRef.current = null;
          } else if (
            response?.error === "INVALID_PHASE" ||
            response?.error === "QUESTION_MISMATCH" ||
            response?.error === "TEAM_NOT_FOUND"
          ) {
            clearPendingFinalSubmission();
            lastPendingReplayKeyRef.current = null;
          }
          dispatch({
            type: "update-draft",
            updater: (previous) => ({
              questionId: state.currentQuestion?.id ?? previous.questionId,
              answer: value,
              selectedIndices: Array.isArray(value)
                ? value.filter(
                    (entry): entry is number => typeof entry === "number",
                  )
                : previous.selectedIndices,
              submissionStatus: response?.success ? "success" : "error",
            }),
          });
        },
      );
    },
    [resolvedTeamId, selectedCompId, state.currentQuestion],
  );

  const toggleIndex = useCallback(
    (index: number) => {
      if (currentTeam?.isExplicitlySubmitted) {
        return;
      }

      const currentQuestion = state.currentQuestion;
      const isMultipleChoice = currentQuestion?.type === "MULTIPLE_CHOICE";
      const content = currentQuestion?.content as
        | MultipleChoiceContent
        | undefined;
      const isSingleChoice =
        isMultipleChoice && content?.correctIndices?.length === 1;

      let nextIndices: number[];
      if (selectedIndices.includes(index)) {
        nextIndices = selectedIndices.filter(
          (existingIndex) => existingIndex !== index,
        );
      } else if (isSingleChoice) {
        nextIndices = [index];
      } else {
        nextIndices = [...selectedIndices, index];
      }

      dispatch({
        type: "replace-draft",
        draftState: {
          questionId: state.currentQuestion?.id ?? null,
          answer: nextIndices,
          selectedIndices: nextIndices,
          submissionStatus: "idle",
        },
      });
      submitAnswer(nextIndices, false);
    },
    [
      currentTeam?.isExplicitlySubmitted,
      selectedIndices,
      state.currentQuestion,
      submitAnswer,
    ],
  );

  const updateAnswer = useCallback(
    (value: AnswerContent) => {
      dispatch({
        type: "update-draft",
        updater: (previous) => ({
          questionId: currentQuestionId,
          answer: value,
          selectedIndices:
            previous.questionId === currentQuestionId
              ? previous.selectedIndices
              : hydratedState.selectedIndices,
          submissionStatus: "idle",
        }),
      });
    },
    [currentQuestionId, hydratedState.selectedIndices],
  );

  const getGradingStatus = useCallback(() => {
    return currentTeam?.lastAnswerCorrect ?? undefined;
  }, [currentTeam]);

  const requestJoker = useCallback(() => {
    if (!resolvedTeamId || !selectedCompId || !state.currentQuestion) {
      return;
    }

    socket.emit("REQUEST_JOKER", {
      competitionId: selectedCompId,
      teamId: resolvedTeamId,
      questionId: state.currentQuestion.id,
    });
  }, [resolvedTeamId, selectedCompId, state.currentQuestion]);

  return {
    competitions,
    selectedCompId,
    joined,
    isReconnecting,
    identity: {
      teamId: resolvedTeamId,
      teamName: currentTeam?.name ?? teamName,
      color: currentTeam?.color ?? color,
    },
    answer,
    selectedIndices,
    submissionStatus,
    currentTeam,
    hasSubmitted: currentTeam?.isExplicitlySubmitted ?? false,
    correctTheErrorPartialScore,
    loginError,
    currentScore: currentTeam?.score ?? 0,
    setTeamName: (nextTeamName: string) =>
      dispatch({ type: "set-team-name", teamName: nextTeamName }),
    setColor: (nextColor: string) =>
      dispatch({ type: "set-color", color: nextColor }),
    setAnswer: updateAnswer,
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

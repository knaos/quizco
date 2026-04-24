import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
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

const AUTO_SUBMIT_DELAY_MS = 500;

const saveTeamToStorage = (teamId: string, teamName: string, color: string) => {
  localStorage.setItem(TEAM_ID_KEY, teamId);
  localStorage.setItem(TEAM_NAME_KEY, teamName);
  localStorage.setItem(TEAM_COLOR_KEY, color);
};

const clearTeamFromStorage = () => {
  localStorage.removeItem(TEAM_ID_KEY);
  localStorage.removeItem(TEAM_NAME_KEY);
  localStorage.removeItem(TEAM_COLOR_KEY);
};

const clearCompetitionFromStorage = () => {
  localStorage.removeItem(SELECTED_COMP_ID_KEY);
};

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

export interface DraftAnswerState {
  questionId: string | null;
  answer: AnswerContent;
  selectedIndices: number[];
  submissionStatus: "idle" | "success" | "error";
}

type DraftAnswerAction =
  | { type: "SET_ANSWER"; payload: AnswerContent; questionId: string | null }
  | { type: "SET_INDICES"; payload: number[]; questionId: string | null }
  | { type: "SET_SUBMISSION_STATUS"; payload: "idle" | "success" | "error" }
  | { type: "RESET" }
  | { type: "HYDRATE_FROM_SERVER"; payload: { questionId: string; answer: AnswerContent; selectedIndices: number[] } };

export function draftAnswerReducer(state: DraftAnswerState, action: DraftAnswerAction): DraftAnswerState {
  switch (action.type) {
    case "SET_ANSWER":
      return {
        ...state,
        questionId: action.questionId,
        answer: action.payload,
        submissionStatus: "idle",
      };
    case "SET_INDICES":
      return {
        ...state,
        questionId: action.questionId,
        answer: action.payload,
        selectedIndices: action.payload,
        submissionStatus: "idle",
      };
    case "SET_SUBMISSION_STATUS":
      return {
        ...state,
        submissionStatus: action.payload,
      };
    case "RESET":
      return {
        questionId: null,
        answer: "",
        selectedIndices: [],
        submissionStatus: "idle",
      };
    case "HYDRATE_FROM_SERVER":
      return {
        questionId: action.payload.questionId,
        answer: action.payload.answer,
        selectedIndices: action.payload.selectedIndices,
        submissionStatus: "idle",
      };
    default:
      return state;
  }
}

export interface TeamState {
  teamId: string | null;
  teamName: string;
  color: string;
  joined: boolean;
}

type TeamAction =
  | { type: "SET_IDENTITY"; payload: { teamId: string; teamName: string; color: string } }
  | { type: "JOIN" }
  | { type: "LEAVE" }
  | { type: "SET_TEAM_NAME"; payload: string }
  | { type: "SET_COLOR"; payload: string };

export function teamReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case "SET_IDENTITY":
      return {
        ...state,
        teamId: action.payload.teamId,
        teamName: action.payload.teamName,
        color: action.payload.color,
      };
    case "JOIN":
      return {
        ...state,
        joined: true,
      };
    case "LEAVE":
      return {
        teamId: null,
        teamName: "",
        color: "#3B82F6",
        joined: false,
      };
    case "SET_TEAM_NAME":
      return {
        ...state,
        teamName: action.payload,
      };
    case "SET_COLOR":
      return {
        ...state,
        color: action.payload,
      };
    default:
      return state;
  }
}

const initialDraftState: DraftAnswerState = {
  questionId: null,
  answer: "",
  selectedIndices: [],
  submissionStatus: "idle",
};

export function usePlayerSession(state: GameState): PlayerSessionResult {
  const savedCompetitionId = localStorage.getItem(SELECTED_COMP_ID_KEY);
  const savedTeamId = localStorage.getItem(TEAM_ID_KEY);
  const savedTeamName = localStorage.getItem(TEAM_NAME_KEY) || "";
  const savedTeamColor = localStorage.getItem(TEAM_COLOR_KEY) || "#3B82F6";

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(
    savedCompetitionId,
  );
  const [isReconnecting, setIsReconnecting] = useState(
    Boolean(savedTeamId && savedCompetitionId),
  );
  const [loginError, setLoginError] = useState<string | null>(null);

  const [teamState, dispatchTeam] = useReducer(teamReducer, {
    teamId: savedTeamId,
    teamName: savedTeamName,
    color: savedTeamColor,
    joined: false,
  });

  const [draftState, dispatchDraft] = useReducer(draftAnswerReducer, initialDraftState);

  const lastPartialSubmissionKeyRef = useRef<string | null>(null);

  const { teamId, teamName, color, joined } = teamState;

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
  const currentQuestionId = state.currentQuestion?.id ?? null;

  const hydratedState = useMemo<DraftAnswerState>(() => {
    if (!state.currentQuestion) {
      return initialDraftState;
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
  const answer = isDraftCurrentQuestion ? draftState.answer : hydratedState.answer;
  const selectedIndices = isDraftCurrentQuestion
    ? draftState.selectedIndices
    : hydratedState.selectedIndices;
  const submissionStatus = isDraftCurrentQuestion
    ? draftState.submissionStatus
    : hydratedState.submissionStatus;

  useEffect(() => {
    if (!selectedCompId) {
      fetch(`${API_URL}/api/competitions`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => setCompetitions(Array.isArray(data) ? data : []))
        .catch((error) => {
          console.error("Failed to fetch competitions:", error);
          setCompetitions([]);
        });
    }
  }, [selectedCompId]);

  useEffect(() => {
    if (!savedTeamId || !savedCompetitionId) {
      return;
    }

    socket.emit(
      "RECONNECT_TEAM",
      { competitionId: savedCompetitionId, teamId: savedTeamId },
      (response: { success: boolean; team: { id?: string; name: string; color: string } }) => {
        if (response.success) {
          const resolvedTeamId = response.team.id ?? savedTeamId;
          dispatchTeam({
            type: "SET_IDENTITY",
            payload: {
              teamId: resolvedTeamId,
              teamName: response.team.name,
              color: response.team.color,
            },
          });
          dispatchTeam({ type: "JOIN" });
          saveTeamToStorage(resolvedTeamId, response.team.name, response.team.color);
        } else {
          clearTeamFromStorage();
        }
        setIsReconnecting(false);
      },
    );
  }, [savedCompetitionId, savedTeamId]);

  useEffect(() => {
    lastPartialSubmissionKeyRef.current = null;
  }, [currentQuestionId]);

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

      const currentQuestion = state.currentQuestion;
      if (!currentQuestion) {
        return;
      }

      const baseAnswer =
        draftState.questionId === currentQuestion.id
          ? draftState.answer
          : hydratedState.answer;
      const hydrated = getHydratedPlayerAnswerState(currentQuestion, baseAnswer);
      const grid = Array.isArray(hydrated.answer)
        ? (hydrated.answer as string[][]).map((row) => [...row])
        : [];

      if (grid[payload.y]?.[payload.x] !== undefined) {
        grid[payload.y][payload.x] = payload.letter.toUpperCase();
      }

      dispatchDraft({
        type: "SET_ANSWER",
        payload: grid,
        questionId: currentQuestion.id,
      });
    };

    socket.on("JOKER_REVEAL", handleJokerReveal);
    return () => {
      socket.off("JOKER_REVEAL", handleJokerReveal);
    };
  }, [teamId, state.currentQuestion, draftState.questionId, draftState.answer, hydratedState]);

  useEffect(() => {
    if (!joined || !teamId || state.phase !== "QUESTION_ACTIVE" || currentTeam?.isExplicitlySubmitted) {
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
          teamId,
          questionId: state.currentQuestion?.id,
          answer,
          isFinal: false,
        });
      }
    }, AUTO_SUBMIT_DELAY_MS);

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
    clearCompetitionFromStorage();
  }, []);

  const setTeamName = useCallback((newTeamName: string) => {
    dispatchTeam({ type: "SET_TEAM_NAME", payload: newTeamName });
  }, []);

  const setColor = useCallback((newColor: string) => {
    dispatchTeam({ type: "SET_COLOR", payload: newColor });
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

        dispatchTeam({
          type: "SET_IDENTITY",
          payload: {
            teamId: response.team.id,
            teamName: response.team.name,
            color: response.team.color,
          },
        });
        dispatchTeam({ type: "JOIN" });
        setLoginError(null);
        saveTeamToStorage(response.team.id, response.team.name, response.team.color);
      },
    );
  }, [color, selectedCompId, teamName]);

  const leaveSession = useCallback(() => {
    clearTeamFromStorage();
    clearCompetitionFromStorage();
    dispatchTeam({ type: "LEAVE" });
    dispatchDraft({ type: "RESET" });
    setSelectedCompId(null);
  }, []);

  const submitAnswer = useCallback(
    (value: AnswerContent, isFinal = false) => {
      if (!state.currentQuestion || !selectedCompId || !teamId) {
        setLoginError("player.session_lost_rejoin");
        dispatchTeam({ type: "LEAVE" });
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
          dispatchDraft({
            type: "SET_SUBMISSION_STATUS",
            payload: response?.success ? "success" : "error",
          });
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

      dispatchDraft({
        type: "SET_INDICES",
        payload: nextIndices,
        questionId: currentQuestion?.id ?? null,
      });
      submitAnswer(nextIndices, false);
    },
    [currentTeam?.isExplicitlySubmitted, selectedIndices, state.currentQuestion, submitAnswer],
  );

  const updateAnswer = useCallback(
    (value: AnswerContent) => {
      dispatchDraft({
        type: "SET_ANSWER",
        payload: value,
        questionId: currentQuestionId,
      });
    },
    [currentQuestionId],
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

  const getCorrectAnswer = useCallback(
    (question: NonNullable<GameState["currentQuestion"]>, t: TFunction) => {
      return getQuestionCorrectAnswer(question, t);
    },
    [],
  );

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
    setAnswer: updateAnswer,
    selectCompetition,
    clearSelectedCompetition,
    joinTeam,
    leaveSession,
    toggleIndex,
    submitAnswer,
    getCorrectAnswer,
    getGradingStatus,
    requestJoker,
  };
}

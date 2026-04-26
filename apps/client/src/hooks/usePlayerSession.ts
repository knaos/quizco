import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
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
import { isStringGrid, isStringArray } from "../utils/answerGuards";

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
  requestJoker: (x: number, y: number) => void;
  jokerUsed: boolean;
  jokerRevealedCells: Set<string>;
}

interface DraftAnswerState {
  questionId: string | null;
  answer: AnswerContent;
  selectedIndices: number[];
  submissionStatus: "idle" | "success" | "error";
}

export function usePlayerSession(state: GameState): PlayerSessionResult {
  const savedCompetitionId = localStorage.getItem(SELECTED_COMP_ID_KEY);
  const savedTeamId = localStorage.getItem(TEAM_ID_KEY);
  const savedTeamName = localStorage.getItem(TEAM_NAME_KEY) || "";
  const savedTeamColor = localStorage.getItem(TEAM_COLOR_KEY) || "#3B82F6";

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(
    savedCompetitionId,
  );
  const [teamId, setTeamId] = useState<string | null>(savedTeamId);
  const [teamName, setTeamName] = useState(savedTeamName);
  const [color, setColor] = useState(savedTeamColor);
  const [joined, setJoined] = useState(false);
  const [draftState, setDraftState] = useState<DraftAnswerState>({
    questionId: null,
    answer: "",
    selectedIndices: [],
    submissionStatus: "idle",
  });
  const [isReconnecting, setIsReconnecting] = useState(
    Boolean(savedTeamId && savedCompetitionId),
  );
  const [loginError, setLoginError] = useState<string | null>(null);
  const [jokerUsed, setJokerUsed] = useState(false);
  const [jokerRevealedCells, setJokerRevealedCells] = useState<Set<string>>(
    new Set(),
  );

  const previousQuestionIdRef = useRef<string | undefined>(undefined);
  if (state.currentQuestion?.id !== previousQuestionIdRef.current) {
    previousQuestionIdRef.current = state.currentQuestion?.id;
    if (state.currentQuestion?.id) {
      setJokerUsed(false);
      setJokerRevealedCells(new Set());
    }
  }

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
        .then((response) => response.json())
        .then((data) => setCompetitions(Array.isArray(data) ? data : []));
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
  }, [savedCompetitionId, savedTeamId]);

  useEffect(() => {
    lastPartialSubmissionKeyRef.current = null;
  }, [currentQuestionId]);

  useEffect(() => {
    startTransition(() => {
      setJokerUsed(false);
      setJokerRevealedCells(new Set());
    });
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

      setJokerUsed(true);
      setJokerRevealedCells((prev) => {
        const newSet = new Set(prev);
        newSet.add(`${payload.x},${payload.y}`);
        return newSet;
      });

      setDraftState((previous) => {
        const currentQuestion = state.currentQuestion;
        if (!currentQuestion) {
          return previous;
        }
        const baseAnswer =
          previous.questionId === currentQuestion.id
            ? previous.answer
            : hydratedState.answer;
        const hydrated = getHydratedPlayerAnswerState(currentQuestion, baseAnswer);
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
      });
    };

    socket.on("JOKER_REVEAL", handleJokerReveal);

    const handleJokerError = (payload: { message: string }) => {
      console.error("Joker error:", payload.message);
    };
    socket.on("JOKER_ERROR", handleJokerError);

    return () => {
      socket.off("JOKER_REVEAL", handleJokerReveal);
      socket.off("JOKER_ERROR", handleJokerError);
    };
  }, [hydratedState.answer, hydratedState.selectedIndices, state.currentQuestion, teamId]);

  useEffect(() => {
    if (!joined || !teamId || state.phase !== "QUESTION_ACTIVE" || currentTeam?.isExplicitlySubmitted) {
      return;
    }

    const timer = window.setTimeout(() => {
      const hasContent = 
        (typeof answer === "string" && answer !== "") ||
        (isStringArray(answer) && answer.length > 0 && answer.some(v => v !== "")) ||
        (isStringGrid(answer) && answer.some(row => row.some(cell => cell !== "")));
      
      const shouldSubmit = state.currentQuestion?.type !== "MULTIPLE_CHOICE" && hasContent;
      if (shouldSubmit) {
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
    setDraftState({
      questionId: null,
      answer: "",
      selectedIndices: [],
      submissionStatus: "idle",
    });
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
          setDraftState((previous) => ({
            questionId: state.currentQuestion?.id ?? previous.questionId,
            answer: value,
            selectedIndices: Array.isArray(value)
              ? value.filter((entry): entry is number => typeof entry === "number")
              : previous.selectedIndices,
            submissionStatus: response?.success ? "success" : "error",
          }));
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

      setDraftState({
        questionId: state.currentQuestion?.id ?? null,
        answer: nextIndices,
        selectedIndices: nextIndices,
        submissionStatus: "idle",
      });
      submitAnswer(nextIndices, false);
    },
    [currentTeam?.isExplicitlySubmitted, selectedIndices, state.currentQuestion, submitAnswer],
  );

  const updateAnswer = useCallback(
    (value: AnswerContent) => {
      setDraftState((previous) => ({
        questionId: currentQuestionId,
        answer: value,
        selectedIndices:
          previous.questionId === currentQuestionId
            ? previous.selectedIndices
            : hydratedState.selectedIndices,
        submissionStatus: "idle",
      }));
    },
    [currentQuestionId, hydratedState.selectedIndices],
  );

  const getGradingStatus = useCallback(() => {
    return currentTeam?.lastAnswerCorrect ?? undefined;
  }, [currentTeam]);

  const requestJoker = useCallback((x: number, y: number) => {
    if (!teamId || !selectedCompId || !state.currentQuestion) {
      return;
    }

    socket.emit("REQUEST_JOKER", {
      competitionId: selectedCompId,
      teamId,
      questionId: state.currentQuestion.id,
      x,
      y,
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
    jokerUsed,
    jokerRevealedCells,
  };
}

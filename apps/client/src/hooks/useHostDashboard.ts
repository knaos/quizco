import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnswerContent,
  Competition,
  GameState,
  Question,
  Round,
} from "@quizco/shared";
import { API_URL, socket } from "../socket";
import { createAuthHeaders } from "../auth";

export interface PendingAnswer {
  id: string;
  teamId: string;
  teamName: string;
  questionId: string;
  questionText: string;
  submittedContent: string;
}

export interface CollectedAnswer {
  teamName: string;
  color: string;
  submittedContent: AnswerContent | string;
  isCorrect: boolean | null;
  points: number;
}

interface PendingAnswerApiRecord {
  id: string;
  teamId?: string;
  team_id?: string;
  teamName?: string;
  team_name?: string;
  questionId?: string;
  question_id?: string;
  questionText?: string;
  question_text?: string;
  submittedContent?: string;
  submitted_content?: string;
}

export interface CompetitionData {
  rounds: (Round & {
    questions: (Question & {
      answers: { isCorrect: boolean | null }[];
    })[];
  })[];
}

export interface HostDashboardResult {
  competitions: Competition[];
  selectedComp: Competition | null;
  compData: CompetitionData | null;
  pendingAnswers: PendingAnswer[];
  collectedAnswers: CollectedAnswer[];
  expandedRounds: Record<string, boolean>;
  isQuestionPickerOpen: boolean;
  modalQuestion: { id: string; text: string } | null;
  modalAnswers: CollectedAnswer[];
  isTransitionDisabled: boolean;
  selectCompetition: (competition: Competition, updateUrl?: boolean) => void;
  handleBack: () => void;
  startQuestion: (questionId: string) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  revealAnswer: () => void;
  handleNext: () => void;
  gradeAnswer: (answerId: string, correct: boolean) => void;
  toggleRound: (roundId: string) => void;
  openQuestionPicker: () => void;
  closeQuestionPicker: () => void;
  openAnswersModal: (questionId: string, questionText: string) => void;
  closeAnswersModal: () => void;
  showLeaderboard: () => void;
  resetCompetition: () => void;
}

export function useHostDashboard(
  state: GameState,
  authToken: string | null,
): HostDashboardResult {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [compData, setCompData] = useState<CompetitionData | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [collectedAnswers, setCollectedAnswers] = useState<CollectedAnswer[]>([]);
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});
  const [isQuestionPickerOpen, setIsQuestionPickerOpen] = useState(false);
  const [modalQuestion, setModalQuestion] = useState<{ id: string; text: string } | null>(null);
  const [modalAnswers, setModalAnswers] = useState<CollectedAnswer[]>([]);
  const [isTransitionDisabled, setIsTransitionDisabled] = useState(false);

  const disableTransition = useCallback(() => {
    setIsTransitionDisabled(true);
    setTimeout(() => setIsTransitionDisabled(false), 1000);
  }, []);

  const fetchPendingAnswers = useCallback(() => {
    if (!selectedComp) {
      return;
    }

    fetch(`${API_URL}/api/admin/pending-answers?competitionId=${selectedComp.id}`, {
      headers: createAuthHeaders(authToken),
    })
      .then((response) => response.json())
      .then((data) => {
        const normalized = (Array.isArray(data) ? data : []).map((item: PendingAnswerApiRecord) => ({
          id: item.id,
          teamId: item.teamId ?? item.team_id ?? "",
          teamName: item.teamName ?? item.team_name ?? "Unknown Team",
          questionId: item.questionId ?? item.question_id ?? "",
          questionText: item.questionText ?? item.question_text ?? "",
          submittedContent: item.submittedContent ?? item.submitted_content ?? "\"\"",
        }));
        setPendingAnswers(normalized);
      });
  }, [authToken, selectedComp]);

  const lastAnswerFetchRef = useRef<number>(0);
  const fetchCurrentQuestionAnswers = useCallback(() => {
    if (!selectedComp || !state.currentQuestion) {
      return;
    }

    // Leading-edge throttle: only fetch if at least 500ms have passed since last fetch
    const now = Date.now();
    if (now - lastAnswerFetchRef.current < 500) {
      return;
    }
    lastAnswerFetchRef.current = now;

    fetch(
      `${API_URL}/api/competitions/${selectedComp.id}/questions/${state.currentQuestion.id}/answers`,
      {
        headers: createAuthHeaders(authToken),
      },
    )
      .then((response) => response.json())
      .then((data: CollectedAnswer[]) => setCollectedAnswers(Array.isArray(data) ? data : []));
  }, [authToken, selectedComp, state.currentQuestion]);

  const selectCompetition = useCallback((competition: Competition, updateUrl = true) => {
    setSelectedComp(competition);
    socket.emit("HOST_JOIN_ROOM", { competitionId: competition.id, authToken });

    if (updateUrl) {
      const params = new URLSearchParams(window.location.search);
      params.set("competitionId", competition.id);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
    }

    fetch(`${API_URL}/api/competitions/${competition.id}/play-data`)
      .then((response) => response.json())
      .then((data) => {
        setCompData(data);
        if (data.rounds.length > 0) {
          setExpandedRounds({ [data.rounds[0].id]: true });
        }
      });
  }, [authToken]);

  const handleBack = useCallback(() => {
    setSelectedComp(null);
    setCompData(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("competitionId");
    window.history.pushState(
      { path: `${window.location.pathname}?${params.toString()}` },
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/competitions`)
      .then((response) => response.json())
      .then((data) => {
        setCompetitions(Array.isArray(data) ? data : []);
        const params = new URLSearchParams(window.location.search);
        const competitionId = params.get("competitionId");
        if (!competitionId) {
          return;
        }
        const matchedCompetition = (Array.isArray(data) ? data : []).find(
          (competition: Competition) => competition.id === competitionId,
        );
        if (matchedCompetition) {
          selectCompetition(matchedCompetition, false);
        }
      });
  }, [selectCompetition]);

  useEffect(() => {
    if (state.phase === "GRADING") {
      fetchPendingAnswers();
    }
    if (["GRADING", "REVEAL_ANSWER", "QUESTION_ACTIVE"].includes(state.phase)) {
      fetchCurrentQuestionAnswers();
    }
  }, [fetchCurrentQuestionAnswers, fetchPendingAnswers, state.phase]);

  useEffect(() => {
    lastAnswerFetchRef.current = 0;
  }, [state.currentQuestion?.id]);

  useEffect(() => {
    const handleGameStateSync = () => {
      if (["QUESTION_ACTIVE", "GRADING", "REVEAL_ANSWER"].includes(state.phase)) {
        fetchCurrentQuestionAnswers();
      }
    };

    socket.on("GAME_STATE_SYNC", handleGameStateSync);
    return () => {
      socket.off("GAME_STATE_SYNC", handleGameStateSync);
    };
  }, [fetchCurrentQuestionAnswers, state.phase]);

  useEffect(() => {
    const handleConnect = () => {
      if (selectedComp) {
        socket.emit("HOST_JOIN_ROOM", { competitionId: selectedComp.id, authToken });
      }
    };

    socket.on("connect", handleConnect);
    return () => {
      socket.off("connect", handleConnect);
    };
  }, [authToken, selectedComp]);

  const emitCompetitionAction = useCallback(
    (eventName: string, payload?: Record<string, unknown>) => {
      if (!selectedComp) {
        return;
      }
      socket.emit(eventName, { competitionId: selectedComp.id, authToken, ...payload });
    },
    [authToken, selectedComp],
  );

  return {
    competitions,
    selectedComp,
    compData,
    pendingAnswers,
    collectedAnswers,
    expandedRounds,
    isQuestionPickerOpen,
    modalQuestion,
    modalAnswers,
    isTransitionDisabled,
    selectCompetition,
    handleBack,
    startQuestion: (questionId: string) => {
      setIsQuestionPickerOpen(false);
      emitCompetitionAction("HOST_START_QUESTION", { questionId });
    },
    startTimer: () => {
      disableTransition();
      emitCompetitionAction("HOST_START_TIMER");
    },
    pauseTimer: () => {
      disableTransition();
      emitCompetitionAction("HOST_PAUSE_TIMER");
    },
    resumeTimer: () => {
      disableTransition();
      emitCompetitionAction("HOST_RESUME_TIMER");
    },
    revealAnswer: () => emitCompetitionAction("HOST_REVEAL_ANSWER"),
    handleNext: () => {
      disableTransition();
      emitCompetitionAction("HOST_NEXT");
    },
    gradeAnswer: (answerId: string, correct: boolean) => {
      emitCompetitionAction("HOST_GRADE_DECISION", { answerId, correct });
      setPendingAnswers((previous) => previous.filter((answer) => answer.id !== answerId));
    },
    toggleRound: (roundId: string) =>
      setExpandedRounds((previous) => ({ ...previous, [roundId]: !previous[roundId] })),
    openQuestionPicker: () => setIsQuestionPickerOpen(true),
    closeQuestionPicker: () => setIsQuestionPickerOpen(false),
    openAnswersModal: (questionId: string, questionText: string) => {
      if (!selectedComp) {
        return;
      }

      setModalQuestion({ id: questionId, text: questionText });
      fetch(
        `${API_URL}/api/competitions/${selectedComp.id}/questions/${questionId}/answers`,
        {
          headers: createAuthHeaders(authToken),
        },
      )
        .then((response) => response.json())
        .then((data) => setModalAnswers(Array.isArray(data) ? data : []));
    },
    closeAnswersModal: () => {
      setModalQuestion(null);
      setModalAnswers([]);
    },
    showLeaderboard: () =>
      emitCompetitionAction("HOST_SET_PHASE", { phase: "LEADERBOARD" }),
    resetCompetition: () => {
      disableTransition();
      emitCompetitionAction("HOST_RESET_COMPETITION");
    },
  };
}

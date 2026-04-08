import { useCallback, useEffect, useState } from "react";
import type { Competition, Question, Round } from "@quizco/shared";
import { API_URL } from "../socket";

const API_BASE = `${API_URL}/api/admin`;

export interface AdminDataResult {
  competitions: Competition[];
  selectedComp: Competition | null;
  rounds: Round[];
  questionsByRound: Record<string, Question[]>;
  isLoading: boolean;
  setSelectedComp: (competition: Competition | null) => void;
  fetchCompetitions: () => Promise<void>;
  fetchRounds: (competitionId: string) => Promise<void>;
  createCompetition: (title: string) => Promise<void>;
  updateCompetition: (competitionId: string, data: Partial<Competition>) => Promise<void>;
  deleteCompetition: (competitionId: string) => Promise<void>;
  createRound: (competitionId: string, title: string, orderIndex: number) => Promise<void>;
  updateRound: (roundId: string, data: Partial<Round>) => Promise<void>;
  deleteRound: (roundId: string) => Promise<void>;
  saveQuestion: (roundId: string, questionData: Partial<Question>) => Promise<void>;
  deleteQuestion: (questionId: string, roundId: string) => Promise<void>;
}

export function useAdminData(
  adminPassword: string | null,
  onUnauthorized: () => void,
): AdminDataResult {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [questionsByRound, setQuestionsByRound] = useState<Record<string, Question[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  const createHeaders = useCallback(
    (includeJson = false) => ({
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
      "x-admin-auth": adminPassword || "",
    }),
    [adminPassword],
  );

  const fetchQuestions = useCallback(
    async (roundId: string) => {
      const response = await fetch(`${API_BASE}/rounds/${roundId}/questions`, {
        headers: createHeaders(),
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setQuestionsByRound((previous) => ({ ...previous, [roundId]: data }));
    },
    [createHeaders],
  );

  const fetchRounds = useCallback(
    async (competitionId: string) => {
      const response = await fetch(`${API_BASE}/competitions/${competitionId}/rounds`, {
        headers: createHeaders(),
      });
      if (!response.ok) {
        if (response.status === 401) {
          onUnauthorized();
        }
        return;
      }

      const data: Round[] = await response.json();
      setRounds(data);
      await Promise.all(data.map((round) => fetchQuestions(round.id)));
    },
    [createHeaders, fetchQuestions, onUnauthorized],
  );

  const fetchCompetitions = useCallback(async () => {
    if (!adminPassword) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/competitions`, {
        headers: createHeaders(),
      });
      if (!response.ok) {
        if (response.status === 401) {
          onUnauthorized();
        }
        return;
      }
      const data = await response.json();
      setCompetitions(data);
    } finally {
      setIsLoading(false);
    }
  }, [adminPassword, createHeaders, onUnauthorized]);

  useEffect(() => {
    if (!adminPassword) {
      return;
    }
    void fetchCompetitions();
  }, [adminPassword, fetchCompetitions]);

  return {
    competitions,
    selectedComp,
    rounds,
    questionsByRound,
    isLoading,
    setSelectedComp,
    fetchCompetitions,
    fetchRounds,
    createCompetition: async (title: string) => {
      const response = await fetch(`${API_BASE}/competitions`, {
        method: "POST",
        headers: createHeaders(true),
        body: JSON.stringify({ title, host_pin: "1234" }),
      });
      if (response.ok) {
        await fetchCompetitions();
      }
    },
    updateCompetition: async (competitionId: string, data: Partial<Competition>) => {
      const response = await fetch(`${API_BASE}/competitions/${competitionId}`, {
        method: "PUT",
        headers: createHeaders(true),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        return;
      }
      await fetchCompetitions();
      if (selectedComp?.id === competitionId) {
        const updatedCompetition = await response.json();
        setSelectedComp(updatedCompetition);
      }
    },
    deleteCompetition: async (competitionId: string) => {
      const response = await fetch(`${API_BASE}/competitions/${competitionId}`, {
        method: "DELETE",
        headers: createHeaders(),
      });
      if (response.ok) {
        await fetchCompetitions();
      }
    },
    createRound: async (competitionId: string, title: string, orderIndex: number) => {
      const response = await fetch(`${API_BASE}/rounds`, {
        method: "POST",
        headers: createHeaders(true),
        body: JSON.stringify({
          competitionId,
          title,
          type: "STANDARD",
          orderIndex,
        }),
      });
      if (response.ok) {
        await fetchRounds(competitionId);
      }
    },
    updateRound: async (roundId: string, data: Partial<Round>) => {
      const response = await fetch(`${API_BASE}/rounds/${roundId}`, {
        method: "PUT",
        headers: createHeaders(true),
        body: JSON.stringify(data),
      });
      if (response.ok && selectedComp) {
        await fetchRounds(selectedComp.id);
      }
    },
    deleteRound: async (roundId: string) => {
      const response = await fetch(`${API_BASE}/rounds/${roundId}`, {
        method: "DELETE",
        headers: createHeaders(),
      });
      if (response.ok && selectedComp) {
        await fetchRounds(selectedComp.id);
      }
    },
    saveQuestion: async (roundId: string, questionData: Partial<Question>) => {
      const isNewQuestion = !questionData.id;
      const response = await fetch(
        isNewQuestion ? `${API_BASE}/questions` : `${API_BASE}/questions/${questionData.id}`,
        {
          method: isNewQuestion ? "POST" : "PUT",
          headers: createHeaders(true),
          body: JSON.stringify(
            isNewQuestion ? { ...questionData, roundId } : questionData,
          ),
        },
      );
      if (response.ok) {
        await fetchQuestions(roundId);
      }
    },
    deleteQuestion: async (questionId: string, roundId: string) => {
      const response = await fetch(`${API_BASE}/questions/${questionId}`, {
        method: "DELETE",
        headers: createHeaders(),
      });
      if (response.ok) {
        await fetchQuestions(roundId);
      }
    },
  };
}

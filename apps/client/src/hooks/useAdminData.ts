import { useCallback, useEffect, useState } from "react";
import type {
  Competition,
  CompetitionImportDocument,
  Question,
  Round,
} from "@quizco/shared";
import { API_URL } from "../socket";
import { createAuthHeaders } from "../auth";

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
  importCompetitionFromFile: (
    file: File,
  ) => Promise<{ ok: boolean; message?: string }>;
  updateCompetition: (
    competitionId: string,
    data: Partial<Competition>,
  ) => Promise<void>;
  deleteCompetition: (competitionId: string) => Promise<void>;
  createRound: (
    competitionId: string,
    title: string,
    orderIndex: number,
  ) => Promise<void>;
  updateRound: (roundId: string, data: Partial<Round>) => Promise<void>;
  deleteRound: (roundId: string) => Promise<void>;
  saveQuestion: (
    roundId: string,
    questionData: Partial<Question>,
  ) => Promise<void>;
  deleteQuestion: (questionId: string, roundId: string) => Promise<void>;
}

export function useAdminData(
  adminToken: string | null,
  onUnauthorized: () => void,
): AdminDataResult {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [questionsByRound, setQuestionsByRound] = useState<
    Record<string, Question[]>
  >({});
  const [isLoading, setIsLoading] = useState(() => Boolean(adminToken));

  const createHeaders = useCallback(
    (includeJson = false) => createAuthHeaders(adminToken, includeJson),
    [adminToken],
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
      const response = await fetch(
        `${API_BASE}/competitions/${competitionId}/rounds`,
        {
          headers: createHeaders(),
        },
      );
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

  const loadCompetitions = useCallback(async () => {
    if (!adminToken) {
      return;
    }
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
  }, [adminToken, createHeaders, onUnauthorized]);

  const fetchCompetitions = useCallback(async () => {
    setIsLoading(true);
    await loadCompetitions();
  }, [loadCompetitions]);

  useEffect(() => {
    void loadCompetitions();
  }, [loadCompetitions]);

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
    importCompetitionFromFile: async (file: File) => {
      let parsed: CompetitionImportDocument;
      try {
        const text = await file.text();
        parsed = JSON.parse(text) as CompetitionImportDocument;
      } catch {
        return {
          ok: false,
          message: "admin.import_invalid_json",
        };
      }

      try {
        const response = await fetch(`${API_BASE}/competitions/import`, {
          method: "POST",
          headers: createHeaders(true),
          body: JSON.stringify(parsed),
        });

        if (response.status === 401) {
          onUnauthorized();
          return { ok: false, message: "admin.import_failed" };
        }

        if (!response.ok) {
          try {
            const payload = (await response.json()) as { message?: string };
            return {
              ok: false,
              message: payload.message ?? "admin.import_failed",
            };
          } catch {
            return { ok: false, message: "admin.import_failed" };
          }
        }

        await fetchCompetitions();
        return { ok: true };
      } catch {
        return { ok: false, message: "admin.import_failed" };
      }
    },
    updateCompetition: async (
      competitionId: string,
      data: Partial<Competition>,
    ) => {
      const response = await fetch(
        `${API_BASE}/competitions/${competitionId}`,
        {
          method: "PUT",
          headers: createHeaders(true),
          body: JSON.stringify(data),
        },
      );
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
      const response = await fetch(
        `${API_BASE}/competitions/${competitionId}`,
        {
          method: "DELETE",
          headers: createHeaders(),
        },
      );
      if (response.ok) {
        await fetchCompetitions();
      }
    },
    createRound: async (
      competitionId: string,
      title: string,
      orderIndex: number,
    ) => {
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
        isNewQuestion
          ? `${API_BASE}/questions`
          : `${API_BASE}/questions/${questionData.id}`,
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

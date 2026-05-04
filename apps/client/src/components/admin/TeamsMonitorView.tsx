import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminAnswerHistoryRecord, AdminTeamOption } from "@quizco/shared";
import { useTranslation } from "react-i18next";
import { socket } from "../../socket";
import { Card } from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { Modal } from "../ui/Modal";

const COMP_KEY = "quizco_admin_teams_competition_id";
const TEAM_KEY = "quizco_admin_teams_team_id";

interface TeamsMonitorViewProps {
  competitions: Array<{ id: string; title: string }>;
  fetchCompetitionTeams: (competitionId: string) => Promise<AdminTeamOption[]>;
  fetchTeamAnswers: (
    competitionId: string,
    teamId: string,
  ) => Promise<AdminAnswerHistoryRecord[]>;
  updateAnswerScore: (
    competitionId: string,
    answerId: string,
    scoreAwarded: number,
    reason?: string,
  ) => Promise<{ answerId: string; scoreAwarded: number } | null>;
  authToken: string | null;
}

export const TeamsMonitorView: React.FC<TeamsMonitorViewProps> = ({
  competitions,
  fetchCompetitionTeams,
  fetchTeamAnswers,
  updateAnswerScore,
  authToken,
}) => {
  const { t } = useTranslation();
  const [competitionId, setCompetitionId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("competitionId") || window.localStorage.getItem(COMP_KEY) || "";
  });
  const [teamId, setTeamId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("teamId") || window.localStorage.getItem(TEAM_KEY) || "";
  });
  const [teams, setTeams] = useState<AdminTeamOption[]>([]);
  const [records, setRecords] = useState<AdminAnswerHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<AdminAnswerHistoryRecord | null>(null);
  const [scoreRecord, setScoreRecord] = useState<AdminAnswerHistoryRecord | null>(null);
  const [scoreInput, setScoreInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [submitError, setSubmitError] = useState("");

  const syncUrl = useCallback((nextCompetitionId: string, nextTeamId: string) => {
    const params = new URLSearchParams(window.location.search);
    if (nextCompetitionId) {
      params.set("competitionId", nextCompetitionId);
      window.localStorage.setItem(COMP_KEY, nextCompetitionId);
    } else {
      params.delete("competitionId");
      window.localStorage.removeItem(COMP_KEY);
    }
    if (nextTeamId) {
      params.set("teamId", nextTeamId);
      window.localStorage.setItem(TEAM_KEY, nextTeamId);
    } else {
      params.delete("teamId");
      window.localStorage.removeItem(TEAM_KEY);
    }
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, []);

  const loadAnswers = useCallback(async () => {
    if (!competitionId || !teamId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchTeamAnswers(competitionId, teamId);
      setRecords(next);
    } finally {
      setLoading(false);
    }
  }, [competitionId, teamId, fetchTeamAnswers]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!competitionId) {
        if (!cancelled) {
          setTeams([]);
        }
        return;
      }

      const nextTeams = await fetchCompetitionTeams(competitionId);
      if (cancelled) {
        return;
      }

      setTeams(nextTeams);
      if (teamId && !nextTeams.some((team) => team.id === teamId)) {
        setTeamId("");
        syncUrl(competitionId, "");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [competitionId, teamId, fetchCompetitionTeams, syncUrl]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!competitionId || !teamId) {
        if (!cancelled) {
          setRecords([]);
        }
        return;
      }

      setLoading(true);
      try {
        const next = await fetchTeamAnswers(competitionId, teamId);
        if (!cancelled) {
          setRecords(next);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [competitionId, teamId, fetchTeamAnswers]);

  useEffect(() => {
    if (!competitionId || !authToken) {
      return;
    }
    socket.emit("HOST_JOIN_ROOM", { competitionId, authToken });
    const refresh = () => {
      void loadAnswers();
    };
    socket.on("GAME_STATE_SYNC", refresh);
    socket.on("SCORE_UPDATE", refresh);
    return () => {
      socket.off("GAME_STATE_SYNC", refresh);
      socket.off("SCORE_UPDATE", refresh);
    };
  }, [competitionId, authToken, loadAnswers]);

  const validationError = useMemo(() => {
    if (!scoreRecord) {
      return "";
    }
    if (scoreInput.trim().length === 0) {
      return t("admin.teams.adjust.validation_required");
    }
    const parsed = Number(scoreInput);
    if (!Number.isInteger(parsed)) {
      return t("admin.teams.adjust.validation_integer");
    }
    if (parsed === scoreRecord.latestScoreAwarded) {
      return t("admin.teams.adjust.validation_no_change");
    }
    if (!reasonInput.trim()) {
      return t("admin.teams.adjust.validation_reason");
    }
    return "";
  }, [scoreRecord, scoreInput, reasonInput, t]);

  const openAdjust = (record: AdminAnswerHistoryRecord) => {
    setScoreRecord(record);
    setScoreInput(String(record.latestScoreAwarded));
    setReasonInput("");
    setConfirmStep(false);
    setSubmitState("idle");
    setSubmitError("");
  };

  const submitAdjust = async () => {
    if (!scoreRecord || validationError) {
      return;
    }
    setSubmitState("loading");
    setSubmitError("");
    const parsed = Number(scoreInput);
    const updated = await updateAnswerScore(
      competitionId,
      scoreRecord.answerId,
      parsed,
      reasonInput.trim(),
    );
    if (!updated) {
      setSubmitState("error");
      setSubmitError(t("admin.teams.adjust.error"));
      return;
    }
    setSubmitState("success");
    await loadAnswers();
  };

  return (
    <div className="max-w-6xl mx-auto" data-testid="admin-teams-view">
      <div className="mb-4">
        <select
          className="rounded-xl border border-gray-300 p-3"
          value={competitionId}
          onChange={(event) => {
            const nextCompetitionId = event.target.value;
            setCompetitionId(nextCompetitionId);
            setTeamId("");
            syncUrl(nextCompetitionId, "");
          }}
          data-testid="admin-teams-competition-select"
        >
          <option value="">{t("admin.teams.select_competition")}</option>
          {competitions.map((competition) => (
            <option key={competition.id} value={competition.id}>
              {competition.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? <div>{t("common.loading")}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="p-3" data-testid="admin-teams-list-pane">
          <div className="mb-2 text-sm font-semibold text-gray-700">{t("admin.teams.select_team")}</div>
          <div className="space-y-2">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => {
                  setTeamId(team.id);
                  syncUrl(competitionId, team.id);
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  team.id === teamId
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                }`}
                data-testid={`admin-teams-list-item-${team.id}`}
              >
                {team.name}
              </button>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden p-0" data-testid="admin-team-answers-pane">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-700">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t("admin.rounds")}</th>
                  <th className="px-4 py-3">{t("admin.question_editor.question_text")}</th>
                  <th className="px-4 py-3">{t("admin.answer_history.current_answer")}</th>
                  <th className="px-4 py-3">{t("admin.answer_history.current_status")}</th>
                  <th className="px-4 py-3">{t("admin.answer_history.snapshot_points")}</th>
                  <th className="px-4 py-3">{t("common.edit")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const latestAnswer = typeof record.latestSubmittedContent === "string"
                    ? record.latestSubmittedContent
                    : JSON.stringify(record.latestSubmittedContent);
                  const hasAnswer = latestAnswer.trim().length > 0 || record.snapshots.length > 0;
                  return (
                    <tr
                      key={record.answerId}
                      className="border-t border-gray-200 align-top"
                      data-testid={`admin-team-answer-row-${record.answerId}`}
                    >
                      <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                      <td className="px-4 py-3 text-gray-700">{record.roundTitle || "-"}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{record.questionText}</td>
                      <td className="px-4 py-3 text-gray-700" data-testid={`admin-team-answer-latest-${record.answerId}`}>
                        {latestAnswer || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-700" data-testid={`admin-team-answer-grading-${record.answerId}`}>
                        {record.latestIsCorrect === null ? "N/A" : record.latestIsCorrect ? "✓" : "✗"}
                      </td>
                      <td className="px-4 py-3 text-gray-700" data-testid={`admin-team-answer-points-${record.answerId}`}>
                        {record.latestScoreAwarded}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => setHistoryRecord(record)}
                            disabled={!hasAnswer}
                            data-testid={`admin-team-answer-history-${record.answerId}`}
                          >
                            {t("admin.teams.view_history")}
                          </Button>
                          <Button
                            variant="warning"
                            onClick={() => openAdjust(record)}
                            disabled={!hasAnswer}
                            data-testid={`admin-team-answer-adjust-${record.answerId}`}
                          >
                            {t("admin.teams.adjust_points")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && teamId && records.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500" data-testid="admin-team-answers-empty">
                {t("admin.answer_history.empty")}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {historyRecord ? (
        <Modal
          title={t("admin.teams.history_title")}
          onClose={() => setHistoryRecord(null)}
          footer={(
            <div className="flex w-full justify-end">
              <Button onClick={() => setHistoryRecord(null)} data-testid="admin-team-history-close">
                {t("common.cancel")}
              </Button>
            </div>
          )}
          scrollable
        >
          <div className="space-y-2" data-testid="admin-team-history-modal">
            {historyRecord.snapshots.map((snapshot) => (
              <div key={snapshot.id} className="rounded-lg border border-gray-200 p-3" data-testid={`admin-team-history-row-${snapshot.id}`}>
                <div>{snapshot.snapshotType}</div>
                <div>{new Date(snapshot.createdAt).toLocaleString()}</div>
                <div>{typeof snapshot.submittedContent === "string" ? snapshot.submittedContent : JSON.stringify(snapshot.submittedContent)}</div>
                <div>{snapshot.scoreAwarded}</div>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}

      {scoreRecord ? (
        <Modal
          title={t("admin.teams.adjust_modal_title")}
          onClose={() => setScoreRecord(null)}
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setScoreRecord(null)} data-testid="admin-team-adjust-cancel">
                {t("common.cancel")}
              </Button>
              {!confirmStep ? (
                <Button
                  onClick={() => setConfirmStep(true)}
                  disabled={!!validationError}
                  data-testid="admin-team-adjust-confirm-step"
                >
                  {t("admin.teams.adjust.confirm_update")}
                </Button>
              ) : (
                <Button
                  variant="warning"
                  isLoading={submitState === "loading"}
                  onClick={() => void submitAdjust()}
                  disabled={!!validationError || submitState === "success"}
                  data-testid="admin-team-adjust-submit"
                >
                  {t("admin.teams.adjust.submit")}
                </Button>
              )}
            </div>
          }
        >
          <div data-testid="admin-team-adjust-modal">
            <Input
              type="number"
              value={scoreInput}
              onChange={(event) => {
                setScoreInput(event.target.value);
                setConfirmStep(false);
                setSubmitState("idle");
              }}
              data-testid="admin-team-adjust-score-input"
            />
            <Input
              type="text"
              value={reasonInput}
              onChange={(event) => {
                setReasonInput(event.target.value);
                setConfirmStep(false);
                setSubmitState("idle");
              }}
              data-testid="admin-team-adjust-reason-input"
            />
            {validationError ? (
              <div className="mt-2 text-sm text-red-600" data-testid="admin-team-adjust-validation-error">{validationError}</div>
            ) : null}
            {submitState === "error" ? <div className="mt-2 text-sm text-red-600">{submitError}</div> : null}
            {submitState === "success" ? (
              <div className="mt-2 text-sm text-green-700" data-testid="admin-team-adjust-success">{t("admin.teams.adjust.success")}</div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

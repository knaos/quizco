import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminAnswerHistoryRecord } from "@quizco/shared";
import { useTranslation } from "react-i18next";
import { Card } from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";

interface AnswerHistoryViewProps {
  competitionId: string;
  fetchAnswerHistory: (competitionId: string) => Promise<AdminAnswerHistoryRecord[]>;
  updateAnswerScore: (
    competitionId: string,
    answerId: string,
    scoreAwarded: number,
  ) => Promise<{ answerId: string; scoreAwarded: number } | null>;
}

export const AnswerHistoryView: React.FC<AnswerHistoryViewProps> = ({
  competitionId,
  fetchAnswerHistory,
  updateAnswerScore,
}) => {
  const { t } = useTranslation();
  const [records, setRecords] = useState<AdminAnswerHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const loadHistory = useCallback(async () => {
    const next = await fetchAnswerHistory(competitionId);
    setRecords(next);
    setScoreDrafts((prev) => {
      const merged = { ...prev };
      for (const item of next) {
        if (merged[item.answerId] === undefined) {
          merged[item.answerId] = String(item.latestScoreAwarded);
        }
      }
      return merged;
    });
  }, [competitionId, fetchAnswerHistory]);

  useEffect(() => {
    let isActive = true;
    fetchAnswerHistory(competitionId)
      .then((next) => {
        if (!isActive) {
          return;
        }
        setRecords(next);
        setScoreDrafts((prev) => {
          const merged = { ...prev };
          for (const item of next) {
            if (merged[item.answerId] === undefined) {
              merged[item.answerId] = String(item.latestScoreAwarded);
            }
          }
          return merged;
        });
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, [competitionId, fetchAnswerHistory]);

  const grouped = useMemo(() => {
    const byQuestion = new Map<string, { questionText: string; rows: AdminAnswerHistoryRecord[] }>();
    for (const record of records) {
      const existing = byQuestion.get(record.questionId);
      if (existing) {
        existing.rows.push(record);
      } else {
        byQuestion.set(record.questionId, {
          questionText: record.questionText,
          rows: [record],
        });
      }
    }
    return Array.from(byQuestion.entries()).map(([questionId, value]) => ({
      questionId,
      ...value,
    }));
  }, [records]);

  const saveScore = async (answerId: string) => {
    const raw = scoreDrafts[answerId] ?? "0";
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }
    setSaving((prev) => ({ ...prev, [answerId]: true }));
    try {
      const updated = await updateAnswerScore(competitionId, answerId, parsed);
      if (!updated) {
        return;
      }
      setRecords((prev) =>
        prev.map((record) =>
          record.answerId === answerId
            ? {
                ...record,
                latestScoreAwarded: updated.scoreAwarded,
              }
            : record,
        ),
      );
      await loadHistory();
    } finally {
      setSaving((prev) => ({ ...prev, [answerId]: false }));
    }
  };

  return (
    <div className="mt-10" data-testid="admin-answer-history-view">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 tracking-tight">{t("admin.answer_history.title")}</h2>
        <Button onClick={() => void loadHistory()} data-testid="admin-answer-history-refresh">
          {t("admin.answer_history.refresh")}
        </Button>
      </div>

      {loading ? <div className="py-6 text-gray-500">{t("common.loading")}</div> : null}

      {!loading && grouped.length === 0 ? (
        <Card className="p-5 text-gray-500" data-testid="admin-answer-history-empty">
          {t("admin.answer_history.empty")}
        </Card>
      ) : null}

      <div className="space-y-4">
        {grouped.map((questionGroup) => (
          <Card key={questionGroup.questionId} className="p-4" data-testid={`admin-answer-history-question-${questionGroup.questionId}`}>
            <h3 className="mb-3 text-lg font-bold text-gray-900">{questionGroup.questionText}</h3>
            <div className="space-y-3">
              {questionGroup.rows.map((record) => {
                const expanded = !!expandedRows[record.answerId];
                const latestAnswer =
                  typeof record.latestSubmittedContent === "string"
                    ? record.latestSubmittedContent
                    : JSON.stringify(record.latestSubmittedContent);

                return (
                  <div
                    key={record.answerId}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                    data-testid={`admin-answer-history-row-${record.answerId}`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-base font-bold text-gray-900">{record.teamName}</div>
                        <div className="text-sm text-gray-600" data-testid={`admin-answer-history-current-answer-${record.answerId}`}>
                          {t("admin.answer_history.current_answer")}: {latestAnswer || "-"}
                        </div>
                        <div className="text-sm text-gray-600" data-testid={`admin-answer-history-current-status-${record.answerId}`}>
                          {t("admin.answer_history.current_status")}: {record.latestIsCorrect === null ? "N/A" : record.latestIsCorrect ? "✓" : "✗"}
                        </div>
                      </div>

                      <div className="flex items-end gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={scoreDrafts[record.answerId] ?? String(record.latestScoreAwarded)}
                          onChange={(event) =>
                            setScoreDrafts((prev) => ({
                              ...prev,
                              [record.answerId]: event.target.value,
                            }))
                          }
                          className="w-28"
                          data-testid={`admin-answer-history-score-input-${record.answerId}`}
                        />
                        <Button
                          onClick={() => void saveScore(record.answerId)}
                          disabled={!!saving[record.answerId]}
                          data-testid={`admin-answer-history-score-save-${record.answerId}`}
                        >
                          {t("admin.answer_history.save_points")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setExpandedRows((prev) => ({
                              ...prev,
                              [record.answerId]: !prev[record.answerId],
                            }))
                          }
                          data-testid={`admin-answer-history-toggle-${record.answerId}`}
                        >
                          {expanded ? t("admin.answer_history.hide_timeline") : t("admin.answer_history.show_timeline")}
                        </Button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="mt-4 space-y-2" data-testid={`admin-answer-history-timeline-${record.answerId}`}>
                        {record.snapshots.map((snapshot) => {
                          const submittedContent =
                            typeof snapshot.submittedContent === "string"
                              ? snapshot.submittedContent
                              : JSON.stringify(snapshot.submittedContent);
                          return (
                            <div
                              key={snapshot.id}
                              className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm"
                              data-testid={`admin-answer-history-snapshot-${snapshot.id}`}
                            >
                              <div className="font-semibold text-gray-900">
                                {snapshot.snapshotType} • {snapshot.actorRole}
                              </div>
                              <div className="text-gray-600">
                                {new Date(snapshot.createdAt).toLocaleString()}
                              </div>
                              <div className="text-gray-700">{t("admin.answer_history.snapshot_answer")}: {submittedContent || "-"}</div>
                              <div className="text-gray-700">{t("admin.answer_history.snapshot_correct")}: {snapshot.isCorrect === null ? "N/A" : snapshot.isCorrect ? "✓" : "✗"}</div>
                              <div className="text-gray-700">{t("admin.answer_history.snapshot_points")}: {snapshot.scoreAwarded}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

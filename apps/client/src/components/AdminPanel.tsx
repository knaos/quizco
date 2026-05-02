import React, { useEffect, useMemo, useState } from "react";
import {
  Lock,
  Layout,
  List,
  LogOut,
  Settings,
  ChevronLeft,
  Monitor,
} from "lucide-react";
import type { Competition, Question, Round } from "@quizco/shared";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CompetitionList } from "./admin/CompetitionList";
import { RoundManager } from "./admin/RoundManager";
import { AnswerHistoryView } from "./admin/AnswerHistoryView";
import { QuestionEditor } from "./admin/QuestionEditor";
import { useAuth } from "../contexts/useAuth";
import { useAdminData } from "../hooks/useAdminData";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { Card } from "./ui/Card";
import Badge from "./ui/Badge";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { PromptDialog } from "./ui/PromptDialog";

type PromptState =
  | { mode: "createCompetition"; value: string }
  | { mode: "renameCompetition"; value: string; competition: Competition }
  | { mode: "createRound"; value: string }
  | { mode: "renameRound"; value: string; round: Round }
  | null;

type ConfirmState =
  | { mode: "deleteCompetition"; competitionId: string }
  | { mode: "deleteRound"; roundId: string }
  | { mode: "deleteQuestion"; questionId: string; roundId: string }
  | null;

export const AdminPanel: React.FC = () => {
  const { t } = useTranslation();
  const { adminToken, isAdminAuthenticated, loginAdmin, logoutAdmin } = useAuth();
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [view, setView] = useState<"COMPETITIONS" | "EDITOR">("COMPETITIONS");
  const [editingQuestion, setEditingQuestion] = useState<{
    roundId: string;
    question: Partial<Question>;
  } | null>(null);
  const [promptState, setPromptState] = useState<PromptState>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const adminData = useAdminData(adminToken, logoutAdmin);

  useEffect(() => {
    document.title = "Admin panel";
  }, []);

  const selectedComp = adminData.selectedComp;

  const promptConfig = useMemo(() => {
    if (!promptState) {
      return null;
    }

    if (promptState.mode === "createCompetition") {
      return {
        title: t("admin.create_competition_title"),
        label: t("admin.new_quiz"),
        placeholder: t("admin.new_quiz_placeholder"),
        submitLabel: t("common.create"),
      };
    }

    if (promptState.mode === "renameCompetition") {
      return {
        title: t("admin.rename_competition_title"),
        label: t("admin.new_quiz"),
        placeholder: t("admin.new_quiz_placeholder"),
        submitLabel: t("common.save"),
      };
    }

    if (promptState.mode === "createRound") {
      return {
        title: t("admin.create_round_title"),
        label: t("admin.add_round"),
        placeholder: t("admin.new_round_placeholder"),
        submitLabel: t("common.create"),
      };
    }

    return {
      title: t("admin.rename_round_title"),
      label: t("admin.add_round"),
      placeholder: t("admin.new_round_placeholder"),
      submitLabel: t("common.save"),
    };
  }, [promptState, t]);

  const submitPrompt = async () => {
    if (!promptState) {
      return;
    }

    const value = promptState.value.trim();
    if (!value) {
      return;
    }

    if (promptState.mode === "createCompetition") {
      await adminData.createCompetition(value);
    } else if (promptState.mode === "renameCompetition") {
      await adminData.updateCompetition(promptState.competition.id, { title: value });
    } else if (promptState.mode === "createRound" && selectedComp) {
      await adminData.createRound(selectedComp.id, value, adminData.rounds.length + 1);
    } else if (promptState.mode === "renameRound") {
      await adminData.updateRound(promptState.round.id, { title: value });
    }

    setPromptState(null);
  };

  const confirmAction = async () => {
    if (!confirmState) {
      return;
    }

    if (confirmState.mode === "deleteCompetition") {
      await adminData.deleteCompetition(confirmState.competitionId);
    } else if (confirmState.mode === "deleteRound") {
      await adminData.deleteRound(confirmState.roundId);
    } else {
      await adminData.deleteQuestion(confirmState.questionId, confirmState.roundId);
    }

    setConfirmState(null);
  };

  const handleSelectCompetition = async (competition: Competition) => {
    adminData.setSelectedComp(competition);
    setView("EDITOR");
    await adminData.fetchRounds(competition.id);
  };

  const handleReorderRound = async (roundId: string, direction: "up" | "down") => {
    const index = adminData.rounds.findIndex((round) => round.id === roundId);
    if (index === -1) {
      return;
    }

    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= adminData.rounds.length) {
      return;
    }

    const roundA = adminData.rounds[index];
    const roundB = adminData.rounds[nextIndex];
    await adminData.updateRound(roundA.id, { ...roundA, orderIndex: roundB.orderIndex });
    await adminData.updateRound(roundB.id, { ...roundB, orderIndex: roundA.orderIndex });
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={(event) => {
          event.preventDefault();
          void loginAdmin(passwordInput).then((success) => {
            setLoginError(success ? null : "host.invalid_password");
          });
        }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full shadow-inner">
              <Lock className="text-blue-600 w-10 h-10" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-center mb-2 text-gray-800 tracking-tight">{t("admin.title")}</h1>
          <p className="text-center text-gray-400 mb-8 font-medium">{t("admin.login_hint")}</p>
          <div className="space-y-4">
            <Input
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder={t("admin.password_placeholder")}
              autoFocus
              error={loginError ? t(loginError) : undefined}
            />
            <Button type="submit" isLoading={adminData.isLoading} className="w-full py-4 rounded-2xl text-lg">
              {t("admin.login_button")}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex">
        <aside className="w-72 bg-gray-900 text-white flex flex-col shadow-2xl z-20">
          <div className="p-8 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-2xl font-black flex items-center tracking-tighter">
              <Layout className="mr-3 text-blue-500" /> QUIZCO<span className="text-blue-500">.</span>
            </h2>
            <LanguageSwitcher />
          </div>
          <nav className="flex-1 p-6 space-y-3">
            <Button
              variant={view === "COMPETITIONS" ? "primary" : "ghost"}
              onClick={() => {
                setView("COMPETITIONS");
                adminData.setSelectedComp(null);
              }}
              className={`w-full justify-start px-5 py-4 rounded-2xl ${view === "COMPETITIONS" ? "shadow-lg shadow-blue-900/50" : ""}`}
            >
              <List className="mr-4 w-6 h-6" /> {t("admin.competitions")}
            </Button>
            <Button variant="ghost" className="w-full justify-start px-5 py-4 rounded-2xl">
              <Settings className="mr-4 w-6 h-6" /> {t("common.edit")}
            </Button>
            <a
              href="/host"
              target="_blank"
              className="w-full flex items-center px-5 py-4 rounded-2xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all font-bold"
            >
              <Monitor className="mr-4 w-6 h-6" /> {t("host.dashboard")}
            </a>
          </nav>
          <div className="p-6 border-t border-gray-800">
            <Button
              variant="ghost"
              onClick={logoutAdmin}
              className="w-full space-x-2 py-3 rounded-xl hover:bg-transparent"
            >
              <LogOut className="w-5 h-5" />
              <span>{t("common.logout")}</span>
            </Button>
          </div>
        </aside>

        <main className="flex-1 p-10 overflow-auto relative">
          {view === "COMPETITIONS" ? (
            <CompetitionList
              competitions={adminData.competitions}
              onSelect={handleSelectCompetition}
              onCreate={() => setPromptState({ mode: "createCompetition", value: "" })}
              onEdit={(competition) =>
                setPromptState({
                  mode: "renameCompetition",
                  competition,
                  value: competition.title,
                })
              }
              onDelete={(competitionId) =>
                setConfirmState({ mode: "deleteCompetition", competitionId })
              }
            />
          ) : (
            <div className="max-w-5xl mx-auto">
              <Button
                variant="ghost"
                onClick={() => {
                  setView("COMPETITIONS");
                  adminData.setSelectedComp(null);
                }}
                className="group text-blue-600 hover:text-blue-800 mb-6 flex items-center p-0 hover:bg-transparent"
              >
                <ChevronLeft className="mr-1 group-hover:-translate-x-1 transition-transform" /> {t("common.back")}
              </Button>

              <Card className="p-8 mb-10 flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                    {selectedComp?.title}
                  </h1>
                  <div className="flex items-center space-x-3 mt-2">
                    <Badge variant="blue">
                      ID: {selectedComp?.id.substring(0, 8)}...
                    </Badge>
                    <Badge variant={selectedComp?.status === "ACTIVE" ? "green" : "yellow"}>
                      {selectedComp?.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!selectedComp) {
                      return;
                    }
                    const nextStatus: Competition["status"] =
                      selectedComp.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
                    void adminData.updateCompetition(selectedComp.id, { status: nextStatus });
                  }}
                  className="px-6 py-3 text-sm shadow-xl shadow-gray-200"
                >
                  {selectedComp?.status === "ACTIVE"
                    ? t("admin.deactivate")
                    : t("admin.publish_quiz")}
                </Button>
              </Card>

              <RoundManager
                rounds={adminData.rounds}
                questionsByRound={adminData.questionsByRound}
                onCreateRound={() => setPromptState({ mode: "createRound", value: "" })}
                onEditRound={(round) =>
                  setPromptState({ mode: "renameRound", round, value: round.title })
                }
                onDeleteRound={(roundId) => setConfirmState({ mode: "deleteRound", roundId })}
                onReorderRound={handleReorderRound}
                onCreateQuestion={(roundId) => setEditingQuestion({ roundId, question: {} })}
                onEditQuestion={(question) =>
                  setEditingQuestion({ roundId: question.roundId, question })
                }
                onDeleteQuestion={(questionId) => {
                  const roundId = adminData.rounds.find((round) =>
                    adminData.questionsByRound[round.id]?.find((question) => question.id === questionId),
                  )?.id;
                  if (roundId) {
                    setConfirmState({ mode: "deleteQuestion", questionId, roundId });
                  }
                }}
                onReorderQuestion={() => {
                  return;
                }}
              />
              {selectedComp ? (
                <AnswerHistoryView
                  competitionId={selectedComp.id}
                  fetchAnswerHistory={adminData.fetchAnswerHistory}
                  updateAnswerScore={adminData.updateAnswerScore}
                />
              ) : null}
            </div>
          )}

          {editingQuestion ? (
            <QuestionEditor
              question={editingQuestion.question}
              onSave={async (questionData) => {
                await adminData.saveQuestion(editingQuestion.roundId, questionData);
                setEditingQuestion(null);
              }}
              onCancel={() => setEditingQuestion(null)}
            />
          ) : null}
        </main>
      </div>

      {promptState && promptConfig ? (
        <PromptDialog
          title={promptConfig.title}
          label={promptConfig.label}
          value={promptState.value}
          onChange={(value) =>
            setPromptState((previous) => (previous ? { ...previous, value } : previous))
          }
          onSubmit={() => {
            void submitPrompt();
          }}
          onCancel={() => setPromptState(null)}
          submitLabel={promptConfig.submitLabel}
          placeholder={promptConfig.placeholder}
        />
      ) : null}

      {confirmState ? (
        <ConfirmDialog
          title={t("common.are_you_sure")}
          message={
            confirmState.mode === "deleteCompetition"
              ? t("admin.confirm_delete_competition")
              : confirmState.mode === "deleteRound"
                ? t("admin.confirm_delete_round")
                : t("admin.confirm_delete_question")
          }
          onConfirm={() => {
            void confirmAction();
          }}
          onCancel={() => setConfirmState(null)}
        />
      ) : null}
    </>
  );
};

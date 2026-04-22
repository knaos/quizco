import React, { useEffect, useRef } from "react";
import type {
  ChronologyContent,
  CorrectTheErrorContent,
  CorrectTheErrorWord,
  FillInTheBlanksContent,
  GamePhase,
  MatchingContent,
  MultipleChoiceContent,
  Question,
} from "@quizco/shared";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Pause,
  Play,
  SkipForward,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useGame } from "../contexts/useGame";
import { useAuth } from "../contexts/useAuth";
import { useHostDashboard } from "../hooks/useHostDashboard";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getQuestionReadOnlyRenderer, getQuestionRevealRenderer } from "./player/questionRenderers";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import { Card } from "./ui/Card";
import { Modal } from "./ui/Modal";
import { Menu, type MenuRef } from "./ui/Menu";

function formatSubmittedContent(value: unknown): string {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return formatSubmittedContent(parsed);
    } catch {
      return value;
    }
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatSubmittedContent(item)).join(", ");
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value ?? "");
}

function formatHostTime(seconds: number): string {
  const totalSec = Math.ceil(seconds);
  if (totalSec >= 60) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return `${totalSec}s`;
}

function renderPresenterAnswerContent(
  question: Question,
  revealStep: number,
  phase: GamePhase,
  t: TFunction,
): React.ReactNode {
  if (question.type === "MULTIPLE_CHOICE") {
    const { options } = question.content as MultipleChoiceContent;

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="host-question-options">
        {options.map((option, index) => {
          const isHidden = revealStep <= index;
          return (
            <div
              key={`${question.id}-option-${index}`}
              className={`rounded-3xl border-2 px-6 py-5 text-2xl font-black transition-all ${isHidden
                ? "border-dashed border-gray-200 bg-gray-100 text-gray-400"
                : "border-blue-100 bg-white text-gray-900 shadow-sm"
                }`}
            >
              <div className="mb-2 text-xs uppercase tracking-[0.3em] text-gray-400">
                {t("host.option_label", { label: String.fromCharCode(65 + index) })}
              </div>
              <div>{isHidden ? t("host.option_hidden") : option}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (question.type === "CLOSED") {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white px-6 py-5 text-2xl font-bold text-slate-900" data-testid="host-question-options">
        {t("host.free_response_placeholder")}
      </div>
    );
  }

  if (question.type === "OPEN_WORD") {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white px-6 py-5 text-2xl font-bold text-slate-900" data-testid="host-question-options">
        {t("host.free_response_placeholder")}
      </div>
    );
  }

  if (question.type === "TRUE_FALSE") {
    const correctAnswer = question.content.isTrue ? t("game.true") : t("game.false");
    if (phase === "REVEAL_ANSWER") {
      return (
        <div className="grid grid-cols-1 gap-4" data-testid="host-question-options">
          <div className="rounded-3xl border-2 border-green-200 bg-green-50 px-6 py-5 text-2xl font-black text-green-900">
            {correctAnswer}
          </div>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="host-question-options">
        {[t("game.true"), t("game.false")].map((label) => (
          <div
            key={label}
            className="rounded-3xl border-2 px-6 py-5 text-2xl font-black border-gray-200 bg-white text-gray-700"
          >
            {label}
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "FILL_IN_THE_BLANKS") {
    const content = question.content as FillInTheBlanksContent;
    return (
      <div className="space-y-5" data-testid="host-question-options">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-xl font-semibold leading-relaxed text-amber-950">
          {content.text}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {content.blanks.map((blank, index) => (
            <div key={`${question.id}-blank-${index}`} className="rounded-3xl border border-gray-200 bg-white p-5">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-gray-400">
                {t("host.blank_label", { number: index + 1 })}
              </div>
              <div className="space-y-2">
                {blank.options.map((option) => (
                  <div
                    key={`${question.id}-blank-${index}-${option.value}`}
                    className="rounded-2xl bg-gray-50 px-4 py-3 text-lg font-bold text-gray-700"
                  >
                    {option.value}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === "MATCHING") {
    const content = question.content as MatchingContent;
    return (
      <div className="grid gap-4 md:grid-cols-2" data-testid="host-question-options">
        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-gray-400">
            {t("host.matching_left_column")}
          </div>
          <div className="space-y-2">
            {content.heroes.map((hero) => (
              <div key={`${hero.id}-left`} className="rounded-2xl bg-gray-50 px-4 py-3 text-lg font-bold text-gray-700">
                {hero.text}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-gray-400">
            {t("host.matching_right_column")}
          </div>
          <div className="space-y-2">
            {content.stories.map((story) => {
              const matchingHero = content.heroes.find((h) => h.id === story.correspondsTo);
              return (
                <div key={`${story.id}-right`} className="rounded-2xl bg-gray-50 px-4 py-3 text-lg font-bold text-gray-700">
                  {story.text} {matchingHero && <span className="text-green-600">(→ {matchingHero.text})</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (question.type === "CHRONOLOGY") {
    const content = question.content as ChronologyContent;
    return (
      <div className="space-y-3" data-testid="host-question-options">
        {content.items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-4 rounded-3xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">
              {index + 1}
            </div>
            <div className="text-xl font-bold text-slate-900">{item.text}</div>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "CORRECT_THE_ERROR") {
    const content = question.content as CorrectTheErrorContent;
    return (
      <div className="space-y-5" data-testid="host-question-options">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-xl font-semibold leading-relaxed text-rose-950">
          {content.text}
        </div>
        <div className="space-y-4">
          {content.words.map((word: CorrectTheErrorWord, index: number) => (
            <div key={`${question.id}-word-${index}`} className="rounded-3xl border border-gray-200 bg-white p-5">
              <div className="mb-3 text-lg font-black text-slate-900">{word.text}</div>
              <div className="space-y-2">
                {word.alternatives.map((alternative: string) => (
                  <div
                    key={`${question.id}-word-${index}-${alternative}`}
                    className="rounded-2xl bg-gray-50 px-4 py-3 text-lg font-bold text-gray-700"
                  >
                    {alternative}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="host-question-options">
      {question.type === "CROSSWORD" ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-lg font-semibold text-gray-700">
          {t("host.crossword_presenter_placeholder")}
        </div>
      ) : (
        getQuestionReadOnlyRenderer({
          question,
          testIdPrefix: "host-presenter",
          t: t as TFunction,
        })
      )}
    </div>
  );
}

export const HostDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const { hostToken } = useAuth();
  const {
    competitions,
    selectedComp,
    compData,
    pendingAnswers,
    collectedAnswers,
    expandedRounds,
    isQuestionPickerOpen,
    modalQuestion,
    modalAnswers,
    selectCompetition,
    handleBack,
    startQuestion,
    pauseTimer,
    resumeTimer,
    handleNext,
    gradeAnswer,
    toggleRound,
    openQuestionPicker,
    closeQuestionPicker,
    openAnswersModal,
    closeAnswersModal,
    showLeaderboard,
    isTransitionDisabled,
  } = useHostDashboard(state, hostToken);

  const menuRef = useRef<MenuRef>(null);

  const visibleCollectedAnswers =
    state.phase === "QUESTION_ACTIVE" || state.phase === "GRADING" || state.phase === "REVEAL_ANSWER"
      ? collectedAnswers
      : [];

  const currentQuestion = state.currentQuestion;
  const currentQuestionText = currentQuestion?.questionText ?? t("host.no_question_active");

  useEffect(() => {
    document.title = "Host dashboard";
  }, []);

  if (!selectedComp) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
        <header className="mb-12 flex w-full max-w-4xl items-center justify-between">
          <h1 className="text-4xl font-black tracking-tight text-gray-900">{t("host.select_quiz")}</h1>
          <LanguageSwitcher />
        </header>
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {competitions.map((comp) => (
            <Card
              key={comp.id}
              variant="default"
              onClick={() => selectCompetition(comp)}
              data-testid={`host-competition-option-${comp.id}`}
              className="cursor-pointer p-8 hover:border-blue-500"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-2xl bg-blue-100 p-3">
                  <Trophy className="h-6 w-6 text-blue-600" />
                </div>
                <Badge variant={comp.status === "ACTIVE" ? "green" : "yellow"}>{comp.status}</Badge>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-800">{comp.title}</h3>
              <p className="font-medium text-gray-500">{t("host.open_dashboard")}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getNextActionLabel = () => {
    switch (state.phase) {
      case "WAITING":
        return t("host.actions.start_competition");
      case "WELCOME":
        return t("host.actions.start_first_round");
      case "ROUND_START":
        return t("host.actions.show_first_question");
      case "QUESTION_PREVIEW":
        if (
          currentQuestion?.type === "MULTIPLE_CHOICE" &&
          state.revealStep < currentQuestion.content.options.length
        ) {
          return t("host.actions.reveal_option", {
            label: String.fromCharCode(65 + state.revealStep),
          });
        }
        return t("host.actions.start_timer_action");
      case "QUESTION_ACTIVE":
        return t("host.actions.end_question_early");
      case "GRADING":
        return t("host.actions.reveal_correct_answer");
      case "REVEAL_ANSWER":
        return t("host.actions.next_question");
      case "ROUND_END":
        return t("host.actions.next_round");
      case "LEADERBOARD":
        return t("host.actions.competition_finished");
      default:
        return t("host.actions.next_generic");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff,_#eef4ff_45%,_#f8fafc_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-2xl border border-gray-200 bg-white p-3 text-gray-500 transition hover:text-gray-700"
              aria-label={t("common.back")}
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{selectedComp.title}</h1>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-slate-700" data-testid="host-team-count">
              {state.teams.length} {t("host.connected_teams")}
            </div>
            <Menu ref={menuRef}>
              <Button
                type="button"
                variant="ghost"
                onClick={openQuestionPicker}
                data-testid="host-open-question-picker"
                className="w-full justify-start rounded-xl px-4"
              >
                {t("host.open_question_picker")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={showLeaderboard}
                className="w-full justify-start rounded-xl px-4"
              >
                <Trophy className="mr-2 h-5 w-5" />
              </Button>
              <div className="flex items-center justify-center rounded-xl px-4 py-2 bg-slate-900">
                <LanguageSwitcher />
              </div>
            </Menu>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <Card className="overflow-hidden border border-blue-100 bg-white/90 p-0 shadow-xl shadow-blue-100/40">
              <div className="border-b border-blue-100 bg-[linear-gradient(135deg,_#eff6ff,_#ffffff_55%,_#eef2ff)] px-6 py-5 md:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="blue">{currentQuestion?.type ?? t("host.presenter_idle_badge")}</Badge>
                      {currentQuestion ? <Badge variant="purple">{t("host.presenter_points", { count: currentQuestion.points })}</Badge> : null}
                      <Badge variant="orange">
                        {t("host.presenter_submissions", {
                          count: visibleCollectedAnswers.length,
                          total: state.teams.length,
                        })}
                      </Badge>
                      <Badge variant="green">
                        {t("host.presenter_phase", { phase: state.phase })}
                        <span className="sr-only" data-testid="host-current-phase">
                          {state.phase}
                        </span>
                      </Badge>
                    </div>
                    <div>
                      <h2
                        className="max-w-4xl text-3xl font-black leading-tight text-slate-950"
                        data-testid="host-presenter-question"
                      >
                        {currentQuestionText}
                      </h2>
                    </div>
                  </div>

                  <div className="flex w-full items-stretch gap-4">
                    <div
                      className="flex w-1/4 min-w-[10rem] flex-col rounded-3xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-xl"
                      data-testid="host-timer-card"
                    >
                      <span className="text-xs font-black uppercase tracking-[0.35em] text-blue-200">{t("common.time")}</span>
                      <span className="mt-2 text-5xl font-black tabular-nums" data-testid="host-timer">
                        {formatHostTime(state.timeRemaining)}
                      </span>
                    </div>
                    {state.phase === "QUESTION_ACTIVE" ? (
                      <Button
                        type="button"
                        variant={state.timerPaused ? "success" : "warning"}
                        onClick={state.timerPaused ? resumeTimer : pauseTimer}
                        disabled={isTransitionDisabled}
                        className="rounded-3xl py-3 text-base"
                        data-testid="host-toggle-timer"
                      >
                        {state.timerPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                        {state.timerPaused ? t("host.resume_timer") : t("host.pause_timer")}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant={
                        state.phase === "QUESTION_ACTIVE"
                          ? "danger"
                          : state.phase === "QUESTION_PREVIEW"
                            ? "success"
                            : "primary"
                      }
                      onClick={handleNext}
                      disabled={isTransitionDisabled || (state.phase === "LEADERBOARD" && state.currentQuestion === null)}
                      data-testid="host-next-action"
                      className="flex w-3/4 items-center justify-center rounded-3xl px-4 text-xl shadow-2xl shadow-blue-200"
                    >
                      <SkipForward className="mr-3 h-7 w-7" />
                      {getNextActionLabel()}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
                {currentQuestion ? (
                  <div className="space-y-6">
                    <div>
                      <p className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                        {t("host.presenter_answers_label")}
                      </p>

                    </div>

                    {state.phase === "REVEAL_ANSWER" ? (
                      <div className="rounded-[2rem] border border-green-200 bg-green-50 p-6" data-testid="host-correct-answer-panel">
                        <p className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-green-600">
                          {t("player.correct_answer")}
                        </p>
                        <div className="text-slate-950">
                          {getQuestionRevealRenderer({
                            question: currentQuestion,
                            lastAnswer: null,
                            t,
                            variant: "host",
                          })}
                        </div>
                      </div>
                    ) :
                      <div data-testid="host-presenter-answer-content">
                        {renderPresenterAnswerContent(currentQuestion, state.revealStep, state.phase, t)}
                      </div>
                    }

                  </div>
                ) : (
                  <div className="rounded-[2rem] border-2 border-dashed border-blue-200 bg-blue-50 px-6 py-10 text-center">
                    <p className="mx-auto max-w-2xl text-xl font-bold text-blue-900">{t("host.no_question_active")}</p>
                  </div>
                )}
              </div>
            </Card>

            {state.phase === "GRADING" && pendingAnswers.length > 0 ? (
              <Card className="border-2 border-yellow-300 bg-yellow-50/80 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <Clock className="h-6 w-6 text-yellow-700" />
                  <h3 className="text-xl font-black uppercase tracking-[0.25em] text-yellow-800">
                    {t("host.manual_grading_queue")} ({pendingAnswers.length})
                  </h3>
                </div>
                <div className="space-y-4">
                  {pendingAnswers.map((answer) => (
                    <div
                      key={answer.id}
                      data-testid={`pending-answer-${answer.id}`}
                      className="flex flex-col gap-4 rounded-3xl border border-yellow-200 bg-white p-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-600">{answer.teamName}</p>
                        <p className="text-xl font-black text-slate-900">{formatSubmittedContent(answer.submittedContent)}</p>
                        <p className="text-sm font-medium text-slate-500">{answer.questionText}</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => gradeAnswer(answer.id, true)}
                          data-testid={`pending-answer-correct-${answer.id}`}
                          className="rounded-2xl bg-green-600 p-4 text-white shadow-lg shadow-green-200 transition hover:bg-green-700"
                          title={t("host.actions.correct_action")}
                        >
                          <CheckCircle className="h-6 w-6" />
                        </button>
                        <button
                          type="button"
                          onClick={() => gradeAnswer(answer.id, false)}
                          data-testid={`pending-answer-incorrect-${answer.id}`}
                          className="rounded-2xl bg-red-500 p-4 text-white shadow-lg shadow-red-200 transition hover:bg-red-600"
                          title={t("host.actions.incorrect_action")}
                        >
                          <XCircle className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card className="border border-white/60 bg-white/90 p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
                    {t("host.presenter_answers_summary")}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">
                    {visibleCollectedAnswers.length}
                    <span className="ml-2 text-lg font-bold text-slate-400">
                      / {state.teams.length}
                    </span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => currentQuestion && openAnswersModal(currentQuestion.id, currentQuestion.questionText)}
                  disabled={!currentQuestion}
                  data-testid="host-open-answers-modal"
                  className="rounded-2xl"
                >
                  <Users className="mr-2 h-5 w-5" />
                  {t("host.view_answers")}
                </Button>
              </div>

              {visibleCollectedAnswers.length > 0 ? (
                <div className="mt-5 space-y-3" data-testid="host-answer-summary-list">
                  {visibleCollectedAnswers.slice(0, 4).map((answer) => (
                    <div
                      key={`${answer.teamName}-${formatSubmittedContent(answer.submittedContent)}`}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: answer.color }} />
                        <span className="font-bold text-slate-800">{answer.teamName}</span>
                      </div>
                      <span className="max-w-[10rem] truncate text-sm font-semibold text-slate-500">
                        {formatSubmittedContent(answer.submittedContent)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm font-medium italic text-slate-400">{t("host.no_submissions")}</p>
              )}
            </Card>

            <Card className="border border-white/60 bg-white/90 p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <h3 className="text-lg font-black uppercase tracking-[0.25em] text-slate-900">{t("host.leaderboard")}</h3>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-3" data-testid="host-leaderboard-summary">
                {state.teams.length === 0 ? (
                  <p className="text-sm font-medium italic text-slate-400">{t("host.no_teams_joined")}</p>
                ) : (
                  [...state.teams]
                    .sort((left, right) => right.score - left.score)
                    .map((team, index) => (
                      <div key={team.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                            {index + 1}
                          </div>
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                          <span className="font-bold text-slate-800">{team.name}</span>
                        </div>
                        <span className="text-lg font-black text-blue-700">{team.score}</span>
                      </div>
                    ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {isQuestionPickerOpen ? (
        <Modal
          title={t("host.question_picker_title")}
          description={t("host.question_picker_description")}
          onClose={closeQuestionPicker}
          data-testid="host-question-picker-modal"
          className="max-w-5xl"
          scrollable
        >
          <div className="space-y-4">
            {compData?.rounds.map((round) => (
              <div key={round.id} className="overflow-hidden rounded-3xl border border-gray-100">
                <button
                  type="button"
                  onClick={() => toggleRound(round.id)}
                  className="flex w-full items-center justify-between bg-slate-50 px-5 py-4 text-left font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3">
                    {expandedRounds[round.id] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <span>{t("host.round_title", { title: round.title })}</span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs uppercase text-slate-500">
                      {round.type}
                    </span>
                  </div>
                  <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    {t("host.questions_count", { count: round.questions.length })}
                  </span>
                </button>

                {expandedRounds[round.id] ? (
                  <div className="grid gap-3 bg-white p-4 md:grid-cols-2">
                    {round.questions.map((question) => {
                      const isCurrentQuestion = currentQuestion?.id === question.id;
                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => startQuestion(question.id)}
                          data-testid={`host-question-option-${question.id}`}
                          className={`rounded-3xl border-2 p-5 text-left transition ${isCurrentQuestion
                            ? "border-blue-500 bg-blue-600 text-white"
                            : "border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50"
                            }`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-4">
                            <div>
                              <p className={`text-xs font-black uppercase tracking-[0.25em] ${isCurrentQuestion ? "text-blue-100" : "text-slate-400"}`}>
                                {question.type}
                              </p>
                              <p className="mt-2 line-clamp-2 text-lg font-black">{question.questionText}</p>
                            </div>
                            {isCurrentQuestion ? <Badge variant="green">{t("host.current_question_badge")}</Badge> : null}
                          </div>
                          <div className={`flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.2em] ${isCurrentQuestion ? "text-blue-100" : "text-slate-500"}`}>
                            <span>{t("host.presenter_points", { count: question.points })}</span>
                            <span>{t("host.presenter_time_limit", { count: question.timeLimitSeconds })}</span>
                            <span>{t("host.presenter_submissions", { count: question.answers.length, total: state.teams.length })}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Modal>
      ) : null}

      {modalQuestion ? (
        <Modal
          title={t("host.collected_answers")}
          description={modalQuestion.text}
          onClose={closeAnswersModal}
          data-testid="host-answers-modal"
          footer={
            <Button type="button" variant="outline" onClick={closeAnswersModal} data-testid="host-close-answers-modal">
              {t("host.close")}
            </Button>
          }
          className="max-w-4xl"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-black uppercase tracking-[0.25em] text-gray-400">
                  <th className="px-2 pb-4">{t("host.team")}</th>
                  <th className="px-2 pb-4">{t("host.answer")}</th>
                  <th className="px-2 pb-4">{t("host.points")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {modalAnswers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-sm font-medium italic text-gray-400">
                      {t("host.no_submissions")}
                    </td>
                  </tr>
                ) : (
                  modalAnswers.map((answer, index) => (
                    <tr key={`${answer.teamName}-${index}`}>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: answer.color }} />
                          <span className="font-bold text-slate-800">{answer.teamName}</span>
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-2">
                          {answer.isCorrect === true ? <CheckCircle className="h-4 w-4 text-green-500" /> : null}
                          {answer.isCorrect === false ? <XCircle className="h-4 w-4 text-red-500" /> : null}
                          <span className="font-medium text-slate-600">{formatSubmittedContent(answer.submittedContent)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <span className={`font-black ${answer.points > 0 ? "text-blue-600" : "text-slate-400"}`}>
                          +{answer.points}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

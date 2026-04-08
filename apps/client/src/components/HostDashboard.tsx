import React, { useEffect } from "react";
import { useGame } from "../contexts/useGame";
import { Users, Play, SkipForward, CheckCircle, Clock, Settings, XCircle, Trophy, ChevronRight, ChevronDown, Pause } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import Button from "./ui/Button";
import { Card, CardHeader, CardTitle, CardFooter } from "./ui/Card";
import Badge from "./ui/Badge";
import { useHostDashboard } from "../hooks/useHostDashboard";
import { getQuestionRevealRenderer } from "./player/questionRenderers";

export const HostDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const {
    competitions,
    selectedComp,
    compData,
    pendingAnswers,
    collectedAnswers,
    expandedRounds,
    modalQuestion,
    modalAnswers,
    selectCompetition,
    handleBack,
    startQuestion,
    startTimer,
    pauseTimer,
    resumeTimer,
    revealAnswer,
    handleNext,
    gradeAnswer,
    toggleRound,
    openAnswersModal,
    closeAnswersModal,
    showLeaderboard,
  } = useHostDashboard(state);

  const visibleCollectedAnswers =
    state.phase === "QUESTION_ACTIVE" || state.phase === "GRADING" || state.phase === "REVEAL_ANSWER"
      ? collectedAnswers
      : [];

  // Set page title
  useEffect(() => {
    document.title = "Host dashboard"
  }, [])

  if (!selectedComp) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
        <header className="w-full max-w-4xl mb-12 flex justify-between items-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('host.select_quiz')}</h1>
          <LanguageSwitcher />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {competitions.map(comp => (
            <Card
              key={comp.id}
              variant="default"
              onClick={() => selectCompetition(comp)}
              data-testid={`host-competition-option-${comp.id}`}
              className="p-8 cursor-pointer hover:border-blue-500 group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 p-3 rounded-2xl group-hover:bg-blue-600 transition-colors">
                  <Trophy className="w-6 h-6 text-blue-600 group-hover:text-white" />
                </div>
                <Badge variant={comp.status === 'ACTIVE' ? 'green' : 'yellow'}>
                  {comp.status}
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{comp.title}</h3>
              <p className="text-gray-500 font-medium flex items-center">
                {t('host.open_dashboard')} <ChevronRight className="ml-1 w-4 h-4" />
              </p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getNextActionLabel = () => {
    switch (state.phase) {
      case "WAITING": return "Start Competition";
      case "WELCOME": return "Start First Round";
      case "ROUND_START": return "Show First Question";
      case "QUESTION_PREVIEW":
        if (state.currentQuestion?.type === "MULTIPLE_CHOICE" && state.revealStep < state.currentQuestion.content.options.length) {
          return `Reveal Option ${String.fromCharCode(65 + state.revealStep)}`;
        }
        return "Start Timer";
      case "QUESTION_ACTIVE": return "End Question Early";
      case "GRADING": return "Reveal Correct Answer";
      case "REVEAL_ANSWER": return "Next Question / End Round";
      case "ROUND_END": return "Next Round / Show Leaderboard";
      case "LEADERBOARD": return "Competition Finished";
      default: return "Next";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={handleBack}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{selectedComp.title}</h1>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{t('host.dashboard')}</p>
          </div>
          <div className="bg-gray-800 p-1 rounded-full scale-90">
            <LanguageSwitcher />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {state.phase === "QUESTION_ACTIVE" && (
            <Button
              variant={state.timerPaused ? "success" : "warning"}
              onClick={state.timerPaused ? resumeTimer : pauseTimer}
              className="space-x-2"
            >
              {state.timerPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              <span>{state.timerPaused ? t("host.resume_timer") : t("host.pause_timer")}</span>
            </Button>
          )}
          <a
            href="/admin"
            target="_blank"
            className="flex items-center space-x-2 bg-white text-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition font-bold"
          >
            <Settings className="w-5 h-5" />
            <span>{t('host.admin_panel')}</span>
          </a>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 font-bold">
            <Users className="text-blue-500 w-5 h-5" />
            <span className="text-gray-700">
              {state.teams.length} {t('host.connected_teams')}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Game Control */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8">
            <h2 className="text-xl font-black mb-6 flex items-center text-gray-800 uppercase tracking-wider">
              <Play className="mr-3 text-green-500" /> {t('host.current_status')}: <span className="text-blue-600 ml-2" data-testid="host-current-phase">{state.phase}</span>
            </h2>

            {state.currentQuestion ? (
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100 space-y-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-black tracking-widest mb-1">
                    {t("player.upcoming_question")}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 leading-tight">{state.currentQuestion.questionText}</p>
                </div>

                {state.phase === "REVEAL_ANSWER" && (
                  <div className="bg-green-100 p-4 rounded-xl border-2 border-green-200">
                    <p className="text-xs text-green-600 font-black uppercase tracking-widest mb-4">
                      {t("player.correct_answer")}
                    </p>
                    <div className="text-xl font-black text-green-900 whitespace-pre-wrap">
                      {getQuestionRevealRenderer({
                        question: state.currentQuestion,
                        lastAnswer: null,
                        t,
                        variant: "host",
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <Badge variant="blue">
                    <Clock className="w-4 h-4 mr-2" />
                    {t('common.time')}: {state.timeRemaining}s
                  </Badge>
                  <Badge variant="purple">
                    {state.currentQuestion.type}
                  </Badge>
                  <Badge variant="orange">
                    <Users className="w-4 h-4 mr-2" />
                    {t('host.submissions')}: {t('host.submissions_count', { count: visibleCollectedAnswers.length, total: state.teams.length })}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 p-8 rounded-2xl border-2 border-dashed border-blue-200 text-center">
                <p className="text-blue-600 font-bold">No question currently active. Select one below to start.</p>
              </div>
            )}
          </Card>

          {state.phase === "GRADING" && pendingAnswers.length > 0 && (
            <Card className="p-8 border-2 border-yellow-400">
              <h2 className="text-xl font-black mb-6 flex items-center text-yellow-700 uppercase tracking-wider">
                <Clock className="mr-3" /> {t('host.manual_grading_queue')} ({pendingAnswers.length})
              </h2>
              <div className="space-y-4">
                {pendingAnswers.map((answer) => (
                  <div key={answer.id} data-testid={`pending-answer-${answer.id}`} className="p-5 bg-yellow-50 rounded-2xl border border-yellow-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-yellow-600 uppercase tracking-widest mb-1">
                        {answer.teamName}
                      </p>
                      <p className="text-xl font-black text-gray-900">{JSON.parse(answer.submittedContent)}</p>
                      <p className="text-sm text-gray-500 font-medium italic mt-1">{answer.questionText}</p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => gradeAnswer(answer.id, true)}
                        data-testid={`pending-answer-correct-${answer.id}`}
                        className="p-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition shadow-lg shadow-green-200"
                        title="Correct"
                      >
                        <CheckCircle className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => gradeAnswer(answer.id, false)}
                        data-testid={`pending-answer-incorrect-${answer.id}`}
                        className="p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition shadow-lg shadow-red-200"
                        title="Incorrect"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(state.phase === "QUESTION_ACTIVE" || state.phase === "GRADING" || state.phase === "REVEAL_ANSWER") && (
            <Card className="p-8">
              <h2 className="text-xl font-black mb-6 flex items-center text-gray-800 uppercase tracking-wider">
                <Users className="mr-3 text-blue-500" /> {t('host.collected_answers')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <th className="pb-4 px-2">{t('host.team')}</th>
                      <th className="pb-4 px-2">{t('host.answer')}</th>
                      <th className="pb-4 px-2">{t('host.points')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visibleCollectedAnswers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-400 font-medium italic">
                          {t('host.no_submissions')}
                        </td>
                      </tr>
                    ) : (
                      visibleCollectedAnswers.map((ans, idx) => (
                        <tr key={idx} className="group">
                          <td className="py-4 px-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ans.color }} />
                              <span className="font-bold text-gray-800">{ans.teamName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex items-center space-x-2">
                              {ans.isCorrect === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                              {ans.isCorrect === false && <XCircle className="w-4 h-4 text-red-500" />}
                              <span className={`font-medium ${ans.isCorrect === true ? "text-green-700" :
                                ans.isCorrect === false ? "text-red-700" :
                                  "text-gray-600"
                                }`}>
                                {typeof ans.submittedContent === 'string' ? ans.submittedContent : JSON.stringify(ans.submittedContent)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <span className={`font-black ${ans.points > 0 ? "text-blue-600" : "text-gray-400"}`}>
                              +{ans.points}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card className="p-8">
            <h2 className="text-xl font-black mb-8 flex items-center text-gray-800 uppercase tracking-wider">
              <SkipForward className="mr-3 text-purple-500" /> {t('host.control_panel')}
            </h2>
            <div className="space-y-8">
              <Button
                variant={state.phase === "QUESTION_ACTIVE" ? "danger" :
                  state.phase === "QUESTION_PREVIEW" ? "success" : "primary"}
                onClick={handleNext}
                disabled={state.phase === "LEADERBOARD" && state.currentQuestion === null}
                data-testid="host-next-action"
                className="w-full py-6 rounded-2xl text-3xl shadow-xl"
              >
                <SkipForward className="mr-4 w-10 h-10" />
                {getNextActionLabel()}
              </Button>

              <div className="grid grid-cols-2 gap-4">
                {state.phase === "QUESTION_PREVIEW" && (
                  <Button
                    variant="outline"
                    onClick={startTimer}
                    className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                  >
                    <Play className="mr-2 w-5 h-5" /> Skip to Timer
                  </Button>
                )}

                {(state.phase === "GRADING" || state.phase === "QUESTION_ACTIVE") && (
                  <Button
                    variant="outline"
                    onClick={revealAnswer}
                    className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200"
                  >
                    <CheckCircle className="mr-2 w-5 h-5" /> Reveal Answer
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={showLeaderboard}
                  className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200"
                >
                  <Trophy className="mr-2 w-5 h-5" /> Show Leaderboard
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-400 font-black uppercase tracking-widest">
                  {t('host.select_question')}
                </p>
                <div className="space-y-4">
                  {compData?.rounds.map((round) => (
                    <div key={round.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => toggleRound(round.id)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition font-bold text-gray-700"
                      >
                        <div className="flex items-center">
                          {expandedRounds[round.id] ? <ChevronDown className="mr-2 w-5 h-5" /> : <ChevronRight className="mr-2 w-5 h-5" />}
                          <span>Round: {round.title}</span>
                          <span className="ml-3 text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-500 uppercase">{round.type}</span>
                        </div>
                        <span className="text-xs text-gray-400">{round.questions.length} Questions</span>
                      </button>

                      {expandedRounds[round.id] && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white">
                          {round.questions.map((q) => (
                            <button
                              key={q.id}
                              onClick={() => startQuestion(q.id)}
                              data-testid={`host-question-option-${q.id}`}
                              className={`${state.currentQuestion?.id === q.id
                                ? "bg-blue-600 text-white ring-4 ring-blue-100"
                                : "bg-white hover:bg-blue-50 text-gray-700 border-2 border-gray-100"
                                } font-bold py-4 px-5 rounded-2xl transition-all text-left flex items-start group relative`}
                            >
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-xs opacity-60 uppercase">{q.type}</p>
                                  <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider">
                                    <span className="flex items-center text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                      <Clock className="w-3 h-3 mr-1" /> {q.timeLimitSeconds}s
                                    </span>
                                    <span className="flex items-center text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                      <Trophy className="w-3 h-3 mr-1" /> {q.points} pts
                                    </span>
                                  </div>
                                </div>
                                <p className="line-clamp-2 mb-2">{q.questionText}</p>

                                <div className={`flex items-center space-x-3 mt-auto p-1.5 rounded-lg ${state.currentQuestion?.id === q.id ? "bg-blue-700/50" : "bg-gray-50"
                                  }`}>
                                  <div className={`flex items-center text-[10px] font-bold ${state.currentQuestion?.id === q.id ? "text-blue-100" : "text-gray-500"
                                    }`}>
                                    <Users className="w-3 h-3 mr-1" />
                                    {q.answers.length}/{state.teams.length}
                                  </div>
                                  {q.answers.length > 0 && (
                                    <div className="flex items-center space-x-2">
                                      <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${state.currentQuestion?.id === q.id
                                        ? "text-green-300 bg-green-900/30"
                                        : "text-green-600 bg-green-50"
                                        }`}>
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {q.answers.filter(a => a.isCorrect === true).length}
                                      </div>
                                      <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${state.currentQuestion?.id === q.id
                                        ? "text-red-300 bg-red-900/30"
                                        : "text-red-600 bg-red-50"
                                        }`}>
                                        <XCircle className="w-3 h-3 mr-1" />
                                        {q.answers.filter(a => a.isCorrect === false).length}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {state.currentQuestion?.id === q.id && (
                                <div className="absolute top-2 right-2">
                                  <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAnswersModal(q.id, q.questionText);
                                }}
                                className="absolute top-2 right-2 p-1 bg-white/20 hover:bg-white/40 rounded-lg transition-colors"
                                title={t('host.view_answers')}
                              >
                                <Users className="w-4 h-4" />
                              </button>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="space-y-6">
          <Card className="p-8 sticky top-8">
            <h2 className="text-xl font-black mb-6 flex items-center text-gray-800 uppercase tracking-wider">
              <Trophy className="mr-3 text-yellow-500" /> {t('host.leaderboard')}
            </h2>
            <div className="space-y-3">
              {state.teams.length === 0 ? (
                <p className="text-gray-400 text-center py-8 font-medium italic">No teams joined yet</p>
              ) : (
                state.teams.sort((a, b) => b.score - a.score).map((team, idx) => (
                  <div key={`${team.id}-${idx}`} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${idx === 0 ? "bg-yellow-50 border-2 border-yellow-100 shadow-sm" : "bg-gray-50"
                    }`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-500"
                        }`}>
                        {idx + 1}
                      </div>
                      <div className="relative">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${team.isConnected ? "bg-green-500" : "bg-red-500"
                          }`} title={team.isConnected ? "Connected" : "Disconnected"} />
                      </div>
                      <span className={`font-bold ${team.isConnected ? "text-gray-800" : "text-gray-400"}`}>
                        {team.name}
                      </span>
                    </div>
                    <span className={`font-black text-xl ${team.isConnected ? "text-blue-600" : "text-blue-300"}`}>
                      {team.score}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Answers Modal */}
      {modalQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border-none shadow-2xl">
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-gray-900">{t('host.collected_answers')}</CardTitle>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{modalQuestion.text}</p>
              </div>
              <Button
                variant="ghost"
                onClick={closeAnswersModal}
                className="p-2 hover:bg-gray-100 rounded-xl"
              >
                <XCircle className="w-6 h-6" />
              </Button>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="pb-4 px-2">{t('host.team')}</th>
                    <th className="pb-4 px-2">{t('host.answer')}</th>
                    <th className="pb-4 px-2">{t('host.points')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {modalAnswers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400 font-medium italic">
                        {t('host.no_submissions')}
                      </td>
                    </tr>
                  ) : (
                    modalAnswers.map((ans, idx) => (
                      <tr key={idx}>
                        <td className="py-4 px-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ans.color }} />
                            <span className="font-bold text-gray-800">{ans.teamName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center space-x-2">
                            {ans.isCorrect === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {ans.isCorrect === false && <XCircle className="w-4 h-4 text-red-500" />}
                            <span className={`font-medium ${ans.isCorrect === true ? "text-green-700" :
                              ans.isCorrect === false ? "text-red-700" :
                                "text-gray-600"
                              }`}>
                              {typeof ans.submittedContent === 'string' ? ans.submittedContent : JSON.stringify(ans.submittedContent)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`font-black ${ans.points > 0 ? "text-blue-600" : "text-gray-400"}`}>
                            +{ans.points}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <CardFooter className="flex justify-end">
              <Button
                variant="outline"
                onClick={closeAnswersModal}
              >
                {t('host.close')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

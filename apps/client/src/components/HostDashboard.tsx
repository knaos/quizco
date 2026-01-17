import React, { useState, useEffect, useCallback } from "react";
import { useGame } from "../contexts/GameContext";
import { socket, API_URL } from "../socket";
import { Users, Play, SkipForward, CheckCircle, Clock, Settings, XCircle, Trophy, ChevronRight, ChevronDown } from "lucide-react";
import type { Question, Competition, Round } from "@quizco/shared";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface PendingAnswer {
  id: string;
  teamId: string;
  teamName: string;
  questionId: string;
  questionText: string;
  submittedContent: string;
}

interface CompetitionData {
  rounds: (Round & {
    questions: (Question & {
      answers: { isCorrect: boolean | null }[];
    })[];
  })[];
}

export const HostDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [compData, setCompData] = useState<CompetitionData | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});

  const selectCompetition = useCallback((comp: Competition, updateUrl = true) => {
    setSelectedComp(comp);
    socket.emit("HOST_JOIN_ROOM", { competitionId: comp.id });
    
    if (updateUrl) {
        const params = new URLSearchParams(window.location.search);
        params.set("competitionId", comp.id);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ path: newUrl }, "", newUrl);
    }

    fetch(`${API_URL}/api/competitions/${comp.id}/play-data`)
      .then((res) => res.json())
      .then((data) => {
          setCompData(data);
          // Auto-expand first round
          if (data.rounds.length > 0) {
              setExpandedRounds({ [data.rounds[0].id]: true });
          }
      });
  }, []);

  const handleBack = useCallback(() => {
      setSelectedComp(null);
      setCompData(null);
      const params = new URLSearchParams(window.location.search);
      params.delete("competitionId");
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
  }, []);

  // Initial fetch of competitions
  useEffect(() => {
    fetch(`${API_URL}/api/competitions`)
      .then((res) => res.json())
      .then((data) => {
          setCompetitions(data);
          
          // Check URL for competitionId
          const params = new URLSearchParams(window.location.search);
          const compId = params.get("competitionId");
          if (compId) {
              const comp = data.find((c: Competition) => c.id === compId);
              if (comp) {
                  selectCompetition(comp, false); // false = don't update URL again
              }
          }
      });
  }, [selectCompetition]);

  const fetchPendingAnswers = () => {
    if (!selectedComp) return;
    fetch(`${API_URL}/api/admin/pending-answers?competitionId=${selectedComp.id}`)
      .then((res) => res.json())
      .then((data) => setPendingAnswers(data));
  };

  useEffect(() => {
    if (state.phase === "GRADING") {
      fetchPendingAnswers();
    }
  }, [state.phase]);

  // Handle socket reconnection
  useEffect(() => {
    const onConnect = () => {
        if (selectedComp) {
            socket.emit("HOST_JOIN_ROOM", { competitionId: selectedComp.id });
        }
    };

    socket.on("connect", onConnect);
    return () => {
        socket.off("connect", onConnect);
    };
  }, [selectedComp]);

  const startQuestion = (id: string) => {
    if (!selectedComp) return;
    socket.emit("HOST_START_QUESTION", { competitionId: selectedComp.id, questionId: id });
  };

  const startTimer = () => {
    if (!selectedComp) return;
    socket.emit("HOST_START_TIMER", { competitionId: selectedComp.id });
  };

  const revealAnswer = () => {
    if (!selectedComp) return;
    socket.emit("HOST_REVEAL_ANSWER", { competitionId: selectedComp.id });
  };

  const handleNext = () => {
    if (!selectedComp) return;
    socket.emit("HOST_NEXT", { competitionId: selectedComp.id });
  };

  const gradeAnswer = (answerId: string, correct: boolean) => {
    if (!selectedComp) return;
    socket.emit("HOST_GRADE_DECISION", { competitionId: selectedComp.id, answerId, correct });
    setPendingAnswers(prev => prev.filter(a => a.id !== answerId));
  };

  const toggleRound = (roundId: string) => {
    setExpandedRounds(prev => ({ ...prev, [roundId]: !prev[roundId] }));
  };

  if (!selectedComp) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
        <header className="w-full max-w-4xl mb-12 flex justify-between items-center">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Select a Quiz</h1>
            <LanguageSwitcher />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            {competitions.map(comp => (
                <button
                    key={comp.id}
                    onClick={() => selectCompetition(comp)}
                    className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-500 transition-all text-left group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-100 p-3 rounded-2xl group-hover:bg-blue-600 transition-colors">
                            <Trophy className="w-6 h-6 text-blue-600 group-hover:text-white" />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            comp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {comp.status}
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{comp.title}</h3>
                    <p className="text-gray-500 font-medium flex items-center">
                        Open dashboard <ChevronRight className="ml-1 w-4 h-4" />
                    </p>
                </button>
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
          <a
            href="/?admin=true"
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
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-black mb-6 flex items-center text-gray-800 uppercase tracking-wider">
              <Play className="mr-3 text-green-500" /> {t('host.current_status')}: <span className="text-blue-600 ml-2">{state.phase}</span>
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
                    <p className="text-xs text-green-600 font-black uppercase tracking-widest mb-1">
                      {t("player.correct_answer")}
                    </p>
                    <p className="text-xl font-black text-green-900">
                      {(() => {
                        const q = state.currentQuestion;
                        if (q.type === "MULTIPLE_CHOICE") {
                          return q.content.correctIndices.map((idx: number) => q.content.options[idx]).join(", ") || "Unknown";
                        }
                        if (q.type === "CLOSED") {
                          return q.content.options[0] || "Unknown";
                        }
                        if (q.type === "OPEN_WORD") {
                          return q.content.answer;
                        }
                        return "See Grid";
                      })()}
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-black flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {t('common.time')}: {state.timeRemaining}s
                  </div>
                  <div className="bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider">
                    {state.currentQuestion.type}
                  </div>
                </div>
              </div>
            ) : (
                <div className="bg-blue-50 p-8 rounded-2xl border-2 border-dashed border-blue-200 text-center">
                    <p className="text-blue-600 font-bold">No question currently active. Select one below to start.</p>
                </div>
            )}
          </section>

          {state.phase === "GRADING" && pendingAnswers.length > 0 && (
            <section className="bg-white p-8 rounded-3xl shadow-sm border-2 border-yellow-400">
              <h2 className="text-xl font-black mb-6 flex items-center text-yellow-700 uppercase tracking-wider">
                <Clock className="mr-3" /> {t('host.manual_grading_queue')} ({pendingAnswers.length})
              </h2>
              <div className="space-y-4">
                {pendingAnswers.map((answer) => (
                  <div key={answer.id} className="p-5 bg-yellow-50 rounded-2xl border border-yellow-200 flex items-center justify-between">
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
                        className="p-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition shadow-lg shadow-green-200"
                        title="Correct"
                      >
                        <CheckCircle className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => gradeAnswer(answer.id, false)}
                        className="p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition shadow-lg shadow-red-200"
                        title="Incorrect"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-black mb-8 flex items-center text-gray-800 uppercase tracking-wider">
              <SkipForward className="mr-3 text-purple-500" /> {t('host.control_panel')}
            </h2>
            <div className="space-y-8">
              <button
                onClick={handleNext}
                disabled={state.phase === "LEADERBOARD" && state.currentQuestion === null}
                className={`w-full ${
                  state.phase === "QUESTION_ACTIVE" ? "bg-red-600 hover:bg-red-700 shadow-red-200" :
                  state.phase === "QUESTION_PREVIEW" ? "bg-green-600 hover:bg-green-700 shadow-green-200" :
                  "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                } text-white font-black py-6 rounded-2xl transition-all text-3xl flex items-center justify-center shadow-xl transform active:scale-[0.98]`}
              >
                <SkipForward className="mr-4 w-10 h-10" />
                {getNextActionLabel()}
              </button>

              <div className="grid grid-cols-2 gap-4">
                {state.phase === "QUESTION_PREVIEW" && (
                  <button
                    onClick={startTimer}
                    className="bg-green-100 text-green-700 hover:bg-green-200 font-bold py-3 rounded-xl transition-all flex items-center justify-center border-2 border-green-200"
                  >
                    <Play className="mr-2 w-5 h-5" /> Skip to Timer
                  </button>
                )}

                {(state.phase === "GRADING" || state.phase === "QUESTION_ACTIVE") && (
                  <button
                    onClick={revealAnswer}
                    className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-bold py-3 rounded-xl transition-all flex items-center justify-center border-2 border-yellow-200"
                  >
                    <CheckCircle className="mr-2 w-5 h-5" /> Reveal Answer
                  </button>
                )}
                
                <button
                  onClick={() => socket.emit("HOST_SET_PHASE", { competitionId: selectedComp.id, phase: "LEADERBOARD" })}
                  className="bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold py-3 rounded-xl transition-all flex items-center justify-center border-2 border-purple-200"
                >
                  <Trophy className="mr-2 w-5 h-5" /> Show Leaderboard
                </button>
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
                                        className={`${
                                            state.currentQuestion?.id === q.id
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
                                            
                                            <div className={`flex items-center space-x-3 mt-auto p-1.5 rounded-lg ${
                                                state.currentQuestion?.id === q.id ? "bg-blue-700/50" : "bg-gray-50"
                                            }`}>
                                                <div className={`flex items-center text-[10px] font-bold ${
                                                    state.currentQuestion?.id === q.id ? "text-blue-100" : "text-gray-500"
                                                }`}>
                                                    <Users className="w-3 h-3 mr-1" />
                                                    {q.answers.length}/{state.teams.length}
                                                </div>
                                                {q.answers.length > 0 && (
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                            state.currentQuestion?.id === q.id 
                                                            ? "text-green-300 bg-green-900/30" 
                                                            : "text-green-600 bg-green-50"
                                                        }`}>
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            {q.answers.filter(a => a.isCorrect === true).length}
                                                        </div>
                                                        <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                            state.currentQuestion?.id === q.id 
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
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="space-y-6">
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-8">
            <h2 className="text-xl font-black mb-6 flex items-center text-gray-800 uppercase tracking-wider">
              <Trophy className="mr-3 text-yellow-500" /> {t('host.leaderboard')}
            </h2>
            <div className="space-y-3">
              {state.teams.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 font-medium italic">No teams joined yet</p>
              ) : (
                state.teams.sort((a,b) => b.score - a.score).map((team, idx) => (
                    <div key={team.id} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                        idx === 0 ? "bg-yellow-50 border-2 border-yellow-100 shadow-sm" : "bg-gray-50"
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                            idx === 0 ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-500"
                        }`}>
                            {idx + 1}
                        </div>
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="font-bold text-gray-800">{team.name}</span>
                      </div>
                      <span className="font-black text-xl text-blue-600">{team.score}</span>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { useGame } from "../contexts/GameContext";
import { socket } from "../socket";
import { Send, Clock, CheckCircle, XCircle, Info, LogOut, Trophy, ChevronRight } from "lucide-react";
import { Crossword } from "./Crossword";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { Competition, MultipleChoiceQuestion } from "@quizco/shared";

const TEAM_ID_KEY = "quizco_team_id";
const TEAM_NAME_KEY = "quizco_team_name";
const TEAM_COLOR_KEY = "quizco_team_color";
const SELECTED_COMP_ID_KEY = "quizco_selected_competition_id";

export const PlayerView: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(localStorage.getItem(SELECTED_COMP_ID_KEY));
  
  const [teamName, setTeamName] = useState(localStorage.getItem(TEAM_NAME_KEY) || "");
  const [color, setColor] = useState(localStorage.getItem(TEAM_COLOR_KEY) || "#3B82F6");
  const [joined, setJoined] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(true);

  // Fetch active competitions if none selected
  useEffect(() => {
    if (!selectedCompId) {
        fetch("http://localhost:4000/api/competitions")
          .then((res) => res.json())
          .then((data) => setCompetitions(data));
    }
  }, [selectedCompId]);

  // Attempt reconnection on mount
  useEffect(() => {
    const savedTeamId = localStorage.getItem(TEAM_ID_KEY);
    const savedCompId = localStorage.getItem(SELECTED_COMP_ID_KEY);
    
    const restoreSession = async () => {
        if (savedTeamId && savedCompId) {
            return new Promise<void>((resolve) => {
                socket.emit("RECONNECT_TEAM", { competitionId: savedCompId, teamId: savedTeamId }, (res: { success: boolean; team: { name: string; color: string } }) => {
                    if (res.success) {
                        setTeamName(res.team.name);
                        setColor(res.team.color);
                        setJoined(true);
                    } else {
                        // If reconnection fails, we don't necessarily clear competition, 
                        // just team identity.
                        localStorage.removeItem(TEAM_ID_KEY);
                    }
                    resolve();
                });
            });
        }
    };

    restoreSession().finally(() => {
        setIsReconnecting(false);
    });
  }, []);

  React.useEffect(() => {
    if (state.currentQuestion) {
      setAnswer("");
      setSubmitted(false);
    }
  }, [state.currentQuestion]);

  const handleSelectCompetition = (id: string) => {
      setSelectedCompId(id);
      localStorage.setItem(SELECTED_COMP_ID_KEY, id);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !selectedCompId) return;
    socket.emit("JOIN_ROOM", { competitionId: selectedCompId, teamName, color }, (res: { success: boolean; team: { id: string; name: string; color: string } }) => {
        if (res.success) {
            localStorage.setItem(TEAM_ID_KEY, res.team.id);
            localStorage.setItem(TEAM_NAME_KEY, res.team.name);
            localStorage.setItem(TEAM_COLOR_KEY, res.team.color);
            setJoined(true);
        }
    });
  };

  const handleLeave = () => {
    if (confirm("Are you sure you want to leave the game? Your score will be preserved if you rejoin with the same name.")) {
        localStorage.removeItem(TEAM_ID_KEY);
        localStorage.removeItem(TEAM_NAME_KEY);
        localStorage.removeItem(TEAM_COLOR_KEY);
        localStorage.removeItem(SELECTED_COMP_ID_KEY);
        window.location.reload(); // Hard reset
    }
  };

  const getTeamId = () => {
    return state.teams.find(t => t.name === teamName)?.id || localStorage.getItem(TEAM_ID_KEY);
  };

  const submitAnswer = (value: string | number) => {
    if (!state.currentQuestion || !selectedCompId) {
        console.error("Submission attempted without active question or competition", {
            question: state.currentQuestion,
            selectedCompId
        });
        return;
    }

    const teamId = getTeamId();
    if (!teamId) {
        console.error("Submission attempted without teamId");
        alert(t('player.session_lost_rejoin'));
        setJoined(false);
        return;
    }

    socket.emit("SUBMIT_ANSWER", {
      competitionId: selectedCompId,
      teamId,
      questionId: state.currentQuestion.id,
      answer: value
    });
    
    setAnswer(String(value));
    setSubmitted(true);
  };

  // Sync Watchdog: Monitor if joined team is still in server state
  useEffect(() => {
    if (joined && !isReconnecting && state.teams.length > 0) {
        const teamId = getTeamId();
        const stillInGame = state.teams.some(t => t.id === teamId || t.name === teamName);
        
        if (!stillInGame) {
            console.warn("Session drift detected: Team not found in server state.");
        }
    }
  }, [state.teams, joined, isReconnecting]);

  if (isReconnecting) {
      return (
          <div className="min-h-screen bg-blue-600 flex items-center justify-center">
              <div className="text-white font-bold animate-pulse text-xl">
                  {t('common.loading')}
              </div>
          </div>
      );
  }

  // Phase 0: Select Quiz
  if (!selectedCompId) {
      return (
        <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4 relative">
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
                <h1 className="text-3xl font-black text-center mb-8 text-gray-800 tracking-tight">Pick a Quiz</h1>
                <div className="space-y-4">
                    {competitions.length === 0 ? (
                        <p className="text-center text-gray-500 font-medium">No active quizzes found.</p>
                    ) : (
                        competitions.map(comp => (
                            <button
                                key={comp.id}
                                onClick={() => handleSelectCompetition(comp.id)}
                                className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-blue-50 border-2 border-transparent hover:border-blue-500 rounded-2xl transition-all group"
                            >
                                <div className="flex items-center">
                                    <div className="bg-blue-100 p-2 rounded-xl group-hover:bg-blue-500 transition-colors mr-4">
                                        <Trophy className="w-5 h-5 text-blue-600 group-hover:text-white" />
                                    </div>
                                    <span className="text-lg font-bold text-gray-700">{comp.title}</span>
                                </div>
                                <ChevronRight className="text-gray-300 group-hover:text-blue-500" />
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
      );
  }

  // Phase 1: Join Team
  if (!joined) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4 relative">
        <div className="absolute top-4 left-4">
            <button 
                onClick={() => { setSelectedCompId(null); localStorage.removeItem(SELECTED_COMP_ID_KEY); }}
                className="text-white/80 hover:text-white flex items-center font-bold"
            >
                <ChevronRight className="w-5 h-5 rotate-180 mr-1" /> Change Quiz
            </button>
        </div>
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <form onSubmit={handleJoin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">{t('player.join_title')}</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('player.team_name')}</label>
              <input 
                type="text" 
                value={teamName} 
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder={t('player.team_name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('player.pick_color')}</label>
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition text-lg shadow-lg"
            >
              {t('player.lets_go')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const getCorrectAnswer = () => {
    if (!state.currentQuestion) return "";
    const { type, content } = state.currentQuestion;
    if (type === "MULTIPLE_CHOICE") {
      return content.options[content.correctIndex] || "Unknown";
    }
    if (type === "CLOSED") {
      // For CLOSED, content.options is a list of acceptable answers
      return content.options[0] || "Unknown";
    }
    if (type === "OPEN_WORD") {
      return content.answer;
    }
    if (type === "CROSSWORD") {
      return t("player.see_grid");
    }
    return "Unknown";
  };

  const isCorrect = () => {
    const team = state.teams.find(t => t.name === teamName);
    return team?.lastAnswerCorrect === true;
  };

  const getGradingStatus = () => {
    const team = state.teams.find(t => t.name === teamName);
    return team?.lastAnswerCorrect;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-bold text-lg text-gray-800">{teamName}</span>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="flex items-center space-x-4">
            <div className="text-gray-600 font-medium">{t('common.score')}: {state.teams.find(t => t.name === teamName)?.score || 0}</div>
            <button onClick={handleLeave} className="text-gray-400 hover:text-red-500 transition">
                <LogOut className="w-5 h-5" />
            </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {(state.phase === "WAITING" || state.phase === "WELCOME") && (
          <div className="space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-b-8 border-blue-600">
              <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
              <h2 className="text-5xl font-black text-gray-900 mb-4">{t('player.waiting_host')}</h2>
              <p className="text-2xl text-gray-500 font-bold">{t('player.get_ready')}</p>
            </div>
          </div>
        )}

        {state.phase === "ROUND_START" && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
            <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-b-8 border-purple-600">
              <span className="text-purple-600 font-black uppercase tracking-[0.3em] text-xl mb-4 block">New Round</span>
              <h2 className="text-6xl font-black text-gray-900 mb-2">
                {state.currentQuestion?.roundId ? "Get Ready!" : "Round Start"}
              </h2>
              <p className="text-3xl text-gray-500 font-bold italic">Prepare your hearts and minds!</p>
            </div>
          </div>
        )}

        {state.phase === "ROUND_END" && (
          <div className="space-y-8 animate-in zoom-in duration-700">
            <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-b-8 border-green-600">
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
              <h2 className="text-5xl font-black text-gray-900 mb-4">Round Finished!</h2>
              <p className="text-2xl text-gray-500 font-bold">Great job, everyone!</p>
              <div className="mt-8 p-6 bg-green-50 rounded-3xl inline-block">
                <p className="text-green-800 font-black text-xl">Waiting for the next round...</p>
              </div>
            </div>
          </div>
        )}

        {state.phase === "QUESTION_PREVIEW" && state.currentQuestion && (
          <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-b-8 border-yellow-500">
              <span className="text-yellow-600 font-black uppercase tracking-widest text-lg mb-4 block">{t('player.upcoming_question')}</span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                {state.currentQuestion.questionText}
              </h2>
            </div>
            
            {state.currentQuestion.type === "MULTIPLE_CHOICE" && state.revealStep > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8">
                {state.currentQuestion.content.options.map((opt: string, i: number) => (
                  <div
                    key={i}
                    className={`p-8 rounded-3xl border-4 transition-all duration-500 transform ${
                      i < state.revealStep 
                      ? "bg-white border-blue-100 shadow-lg scale-100 opacity-100 translate-y-0" 
                      : "bg-gray-100 border-transparent opacity-0 translate-y-4 scale-95"
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl mr-6 shadow-lg shadow-blue-200">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-3xl font-black text-gray-800 text-left">{opt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <Clock className="w-16 h-16 text-yellow-500 animate-spin-slow mx-auto" />
              <p className="text-2xl font-black text-gray-500 uppercase tracking-widest">{t('player.host_reading')}</p>
            </div>
          </div>
        )}

        {state.phase === "QUESTION_ACTIVE" && state.currentQuestion && (
          <div className="w-full max-w-2xl space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-md border-b-4 border-blue-500">
              <span className="text-blue-600 font-bold uppercase tracking-wider text-sm">Question</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-2 text-gray-800">
                {state.currentQuestion.questionText}
              </h2>
            </div>

            {!submitted ? (
              <div className="space-y-6 w-full">
                {state.currentQuestion.type === "MULTIPLE_CHOICE" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {state.currentQuestion.content?.options?.map((opt: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => submitAnswer(i)}
                        className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-500 p-6 rounded-xl text-xl font-semibold transition text-left"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : state.currentQuestion.type === "CROSSWORD" ? (
                  <div className="bg-white p-4 rounded-xl shadow-inner max-h-[60vh] overflow-auto">
                    <Crossword
                      data={state.currentQuestion.content}
                        onCrosswordCorrect={(isCorrect: boolean) => {
                          if (isCorrect) {
                            submitAnswer("COMPLETED");
                          }
                        }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitAnswer(answer)}
                      className="w-full p-4 text-2xl rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
                      placeholder="Type your answer..."
                    />
                    <button
                      onClick={() => submitAnswer(answer)}
                      className="bg-blue-600 text-white font-bold py-4 rounded-xl text-xl flex items-center justify-center space-x-2 shadow-lg"
                    >
                      <Send /> <span>{t('player.submit_answer')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-green-100 p-8 rounded-2xl border-2 border-green-500">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-800">{t('player.answer_received')}</h2>
                <p className="text-green-700">{t('player.waiting_others')}</p>
              </div>
            )}

            <div className="text-4xl font-black text-gray-300">
              {state.timeRemaining}s
            </div>
          </div>
        )}

        {state.phase === "GRADING" && (
           <div className="space-y-4">
            <Clock className="w-16 h-16 text-orange-500 mx-auto" />
            <h2 className="text-3xl font-bold text-gray-800">{t('player.times_up')}</h2>
            <p className="text-xl text-gray-500">The round has ended. Waiting for the host to reveal the answer...</p>
          </div>
        )}

        {state.phase === "LEADERBOARD" && (
          <div className="w-full max-w-4xl space-y-8 animate-in zoom-in duration-700">
             <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-b-8 border-yellow-500">
                <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
                <h2 className="text-5xl font-black text-gray-900 mb-8">{t('host.leaderboard')}</h2>
                
                <div className="space-y-4">
                  {[...state.teams].sort((a,b) => b.score - a.score).map((team, idx) => (
                    <div key={team.id} className={`flex items-center justify-between p-6 rounded-3xl ${
                      idx === 0 ? "bg-yellow-50 border-4 border-yellow-200" : "bg-gray-50 border-4 border-transparent"
                    }`}>
                      <div className="flex items-center space-x-6">
                        <span className="text-3xl font-black text-gray-400 w-12">{idx + 1}</span>
                        <div className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: team.color }} />
                        <span className="text-3xl font-black text-gray-800">{team.name}</span>
                      </div>
                      <span className="text-4xl font-black text-blue-600">{team.score}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {state.phase === "REVEAL_ANSWER" && state.currentQuestion && (
          <div className="w-full max-w-3xl space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-blue-500 text-left">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2 text-blue-600">
                  <Info className="w-6 h-6" />
                  <span className="font-bold uppercase tracking-widest text-sm">{t("player.reveal_phase")}</span>
                </div>
                {getGradingStatus() === true ? (
                  <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full font-bold flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" /> {t("player.correct")}
                  </span>
                ) : getGradingStatus() === false ? (
                  <span className="bg-red-100 text-red-700 px-4 py-1 rounded-full font-bold flex items-center">
                    <XCircle className="w-4 h-4 mr-2" /> {t("player.incorrect")}
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-700 px-4 py-1 rounded-full font-bold flex items-center">
                    <Clock className="w-4 h-4 mr-2" /> {t("player.waiting_grading")}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-8">{state.currentQuestion.questionText}</h2>

              <div className="space-y-6">
                {state.currentQuestion.type === "MULTIPLE_CHOICE" ? (
                  <div className="grid grid-cols-1 gap-4">
                    {(() => {
                      const question = state.currentQuestion as MultipleChoiceQuestion;
                      const team = state.teams.find((t) => t.name === teamName);
                      const lastAnswer = team?.lastAnswer;
                      
                      return question.content.options.map((opt: string, i: number) => {
                        const isOptionCorrect = i === question.content.correctIndex;
                        const isSelected = lastAnswer !== null && lastAnswer !== undefined && i === Number(lastAnswer);

                        let containerClass = "p-6 rounded-2xl border-2 transition-all flex items-center justify-between ";
                        if (isOptionCorrect) {
                          containerClass += "border-green-500 bg-green-50 shadow-md scale-[1.02]";
                        } else if (isSelected && !isOptionCorrect) {
                          containerClass += "border-red-500 bg-red-50 opacity-80";
                        } else {
                          containerClass += "border-gray-100 bg-gray-50 opacity-40";
                        }

                        return (
                          <div key={i} className={containerClass}>
                            <span
                              className={`text-xl font-bold ${
                                isOptionCorrect ? "text-green-800" : isSelected ? "text-red-800" : "text-gray-500"
                              }`}
                            >
                              {opt}
                            </span>
                            <div className="flex items-center space-x-3">
                              {isSelected && (
                                <span
                                  className={`text-xs font-black uppercase px-2 py-1 rounded ${
                                    isOptionCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                                  }`}
                                >
                                  {t("player.your_choice")}
                                </span>
                              )}
                              {isOptionCorrect && <CheckCircle className="text-green-600 w-8 h-8" />}
                              {isSelected && !isOptionCorrect && <XCircle className="text-red-600 w-8 h-8" />}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-200">
                      <span className="text-green-600 text-xs font-bold uppercase">{t('player.correct_answer')}</span>
                      <p className="text-2xl font-black text-green-900 mt-1">{getCorrectAnswer()}</p>
                    </div>
                    <div className={`${isCorrect() ? "bg-green-50 border-green-200" : getGradingStatus() === false ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"} p-6 rounded-2xl border-2`}>
                      <span className={`${isCorrect() ? "text-green-600" : getGradingStatus() === false ? "text-red-600" : "text-gray-600"} text-xs font-bold uppercase`}>{t('player.your_answer')}</span>
                      <p className={`text-2xl font-black ${isCorrect() ? "text-green-900" : getGradingStatus() === false ? "text-red-900" : "text-gray-900"} mt-1`}>
                        {state.teams.find((t) => t.name === teamName)?.lastAnswer || "(No Answer)"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg animate-pulse inline-block mx-auto">
              <p className="text-xl font-bold flex items-center">
                 <Clock className="mr-2" /> {t('player.next_soon')}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

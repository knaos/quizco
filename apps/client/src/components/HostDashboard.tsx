import React, { useState, useEffect } from "react";
import { useGame } from "../contexts/GameContext";
import { socket } from "../socket";
import { Users, Play, SkipForward, CheckCircle, Clock, Settings } from "lucide-react";
import type { Question } from "@quizco/shared";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

export const HostDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetch("http://localhost:4000/api/questions")
      .then((res) => res.json())
      .then((data) => setQuestions(data));
  }, []);

  const startQuestion = (id: string) => {
    socket.emit("HOST_START_QUESTION", { questionId: id });
  };

  const startTimer = () => {
    socket.emit("HOST_START_TIMER");
  };

  const revealAnswer = () => {
    socket.emit("HOST_REVEAL_ANSWER");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-800">{t('host.dashboard')}</h1>
          <div className="bg-gray-800 p-1 rounded-full scale-90">
            <LanguageSwitcher />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="/?admin=true"
            className="flex items-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-700 transition"
          >
            <Settings className="w-5 h-5" />
            <span className="font-semibold">Admin Panel</span>
          </a>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow">
            <Users className="text-blue-500" />
            <span className="font-semibold">
              {state.teams.length} {t('host.connected_teams')}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Game Control */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Play className="mr-2 text-green-500" /> {t('host.current_status')}: {state.phase}
            </h2>
            
            {state.currentQuestion && (
              <div className="border-t pt-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-500 uppercase font-bold tracking-tighter">{t('player.upcoming_question')}</p>
                  <p className="text-2xl font-bold text-gray-900">{state.currentQuestion.question_text}</p>
                </div>
                
                {state.phase === "REVEAL_ANSWER" && (
                  <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                    <p className="text-sm text-green-600 font-bold uppercase">{t('player.correct_answer')}</p>
                    <p className="text-xl font-black text-green-900">
                      {state.currentQuestion.type === "MULTIPLE_CHOICE" || state.currentQuestion.type === "CLOSED"
                        ? state.currentQuestion.content?.options?.[state.currentQuestion.content?.correctIndex]
                        : (state.currentQuestion.content?.answer || state.currentQuestion.content?.correctAnswer)}
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-bold flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {t('common.time')}: {state.timeRemaining}s
                  </div>
                  <div className="bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-bold uppercase">
                    Type: {state.currentQuestion.type}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <SkipForward className="mr-2 text-purple-500" /> {t('host.control_panel')}
            </h2>
            <div className="space-y-4">
              {state.phase === "QUESTION_PREVIEW" && (
                <button
                  onClick={startTimer}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg transition text-xl flex items-center justify-center"
                >
                  <Play className="mr-2" /> {t('host.start_timer')}
                </button>
              )}

              {(state.phase === "GRADING" || state.phase === "QUESTION_ACTIVE") && (
                <button
                  onClick={revealAnswer}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 rounded-lg transition text-xl flex items-center justify-center"
                >
                  <CheckCircle className="mr-2" /> {t('host.reveal_answer')}
                </button>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2 uppercase font-bold tracking-wider">
                  {t('host.select_question')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => startQuestion(q.id)}
                      className={`${
                        state.currentQuestion?.id === q.id
                          ? "bg-blue-800 ring-4 ring-blue-300"
                          : "bg-blue-600 hover:bg-blue-700"
                      } text-white font-bold py-3 px-4 rounded-lg transition text-left`}
                    >
                      {state.currentQuestion?.id === q.id ? "RELOAD: " : "LOAD: "}
                      {q.question_text.substring(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <CheckCircle className="mr-2 text-yellow-500" /> {t('host.leaderboard')}
            </h2>
            <div className="space-y-4">
              {state.teams.sort((a,b) => b.score - a.score).map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-medium">{team.name}</span>
                  </div>
                  <span className="font-bold text-lg">{team.score}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

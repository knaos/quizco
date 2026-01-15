import React, { useState, useEffect } from "react";
import { useGame } from "../contexts/GameContext";
import { socket } from "../socket";
import { Users, Play, SkipForward, CheckCircle } from "lucide-react";

export const HostDashboard: React.FC = () => {
  const { state } = useGame();
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://localhost:4000/api/questions")
      .then((res) => res.json())
      .then((data) => setQuestions(data));
  }, []);

  const startQuestion = (id: string) => {
    socket.emit("HOST_START_QUESTION", { questionId: id });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Host Dashboard</h1>
        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow">
          <Users className="text-blue-500" />
          <span className="font-semibold">{state.teams.length} Teams Connected</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Game Control */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Play className="mr-2 text-green-500" /> Current Status: {state.phase}
            </h2>
            
            {state.currentQuestion && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 uppercase font-semibold">Current Question</p>
                <p className="text-lg font-medium">{state.currentQuestion.question_text}</p>
                <div className="mt-4 flex items-center space-x-4">
                  <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                    Time: {state.timeRemaining}s
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <SkipForward className="mr-2 text-purple-500" /> Control Panel
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => startQuestion(q.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition text-left"
                >
                  Start: {q.question_text.substring(0, 30)}...
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <CheckCircle className="mr-2 text-yellow-500" /> Leaderboard
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

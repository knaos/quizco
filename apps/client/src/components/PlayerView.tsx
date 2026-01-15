import React, { useState } from "react";
import { useGame } from "../contexts/GameContext";
import { socket } from "../socket";
import { Send, Clock, CheckCircle } from "lucide-react";
import { Crossword } from "./Crossword";

export const PlayerView: React.FC = () => {
  const { state } = useGame();
  const [teamName, setTeamName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [joined, setJoined] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName) return;
    socket.emit("JOIN_ROOM", { teamName, color });
    setJoined(true);
  };

  const handleSubmit = () => {
    if (!state.currentQuestion) return;
    socket.emit("SUBMIT_ANSWER", { 
      teamId: state.teams.find(t => t.name === teamName)?.id, 
      questionId: state.currentQuestion.id, 
      answer 
    });
    setSubmitted(true);
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4">
        <form onSubmit={handleJoin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Join the Quiz!</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
              <input 
                type="text" 
                value={teamName} 
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="Enter team name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pick a Color</label>
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
              Let's Go!
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-bold text-lg text-gray-800">{teamName}</span>
        </div>
        <div className="text-gray-600 font-medium">Score: {state.teams.find(t => t.name === teamName)?.score || 0}</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {state.phase === "WAITING" && (
          <div className="space-y-4">
            <Clock className="w-16 h-16 text-blue-500 animate-pulse mx-auto" />
            <h2 className="text-2xl font-bold text-gray-800">Waiting for the host to start...</h2>
            <p className="text-gray-500">Get ready!</p>
          </div>
        )}

        {state.phase === "QUESTION_ACTIVE" && state.currentQuestion && (
          <div className="w-full max-w-2xl space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-md border-b-4 border-blue-500">
              <span className="text-blue-600 font-bold uppercase tracking-wider text-sm">Question</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-2 text-gray-800">
                {state.currentQuestion.question_text}
              </h2>
            </div>

            {!submitted ? (
              <div className="space-y-6 w-full">
                {state.currentQuestion.type === "MULTIPLE_CHOICE" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {state.currentQuestion.content.options.map((opt: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => {
                          setAnswer(i.toString());
                          setSubmitted(true);
                          socket.emit("SUBMIT_ANSWER", {
                            teamId: state.teams.find((t) => t.name === teamName)
                              ?.id,
                            questionId: state.currentQuestion!.id,
                            answer: i,
                          });
                        }}
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
                          socket.emit("SUBMIT_ANSWER", {
                            teamId: state.teams.find((t) => t.name === teamName)
                              ?.id,
                            questionId: state.currentQuestion!.id,
                            answer: "COMPLETED",
                          });
                          setSubmitted(true);
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
                      className="w-full p-4 text-2xl rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none"
                      placeholder="Type your answer..."
                    />
                    <button
                      onClick={handleSubmit}
                      className="bg-blue-600 text-white font-bold py-4 rounded-xl text-xl flex items-center justify-center space-x-2 shadow-lg"
                    >
                      <Send /> <span>Submit Answer</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-green-100 p-8 rounded-2xl border-2 border-green-500">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-800">Answer Received!</h2>
                <p className="text-green-700">Waiting for other teams...</p>
              </div>
            )}

            <div className="text-4xl font-black text-gray-300">
              {state.timeRemaining}s
            </div>
          </div>
        )}

        {state.phase === "GRADING" && (
           <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Time's up!</h2>
            <p className="text-gray-500">Wait for grading...</p>
          </div>
        )}
      </main>
    </div>
  );
};

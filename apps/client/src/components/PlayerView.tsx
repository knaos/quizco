import React, { useState } from "react";
import { useGame } from "../contexts/GameContext";
import { socket } from "../socket";
import { Send, Clock, CheckCircle, XCircle, Info } from "lucide-react";
import { Crossword } from "./Crossword";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const PlayerView: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const [teamName, setTeamName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [joined, setJoined] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    if (state.currentQuestion) {
      setAnswer("");
      setSubmitted(false);
    }
  }, [state.currentQuestion?.id]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName) return;
    socket.emit("JOIN_ROOM", { teamName, color });
    setJoined(true);
  };

  const getTeamId = () => {
    return state.teams.find(t => t.name === teamName)?.id;
  };

  const handleSubmit = () => {
    if (!state.currentQuestion) return;
    const teamId = getTeamId();
    if (!teamId) return;
    
    socket.emit("SUBMIT_ANSWER", { 
      teamId, 
      questionId: state.currentQuestion.id, 
      answer 
    });
    setSubmitted(true);
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4 relative">
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
    if (type === "MULTIPLE_CHOICE" || type === "CLOSED") {
      return content.options[content.correctIndex] || "Unknown";
    }
    return content.answer || content.correctAnswer || "Unknown";
  };

  const isCorrect = () => {
    if (!state.currentQuestion) return false;
    const { type, content } = state.currentQuestion;
    if (type === "MULTIPLE_CHOICE" || type === "CLOSED") {
      return parseInt(answer) === content.correctIndex;
    }
    // Simple string comparison for other types
    return answer.toLowerCase().trim() === getCorrectAnswer().toString().toLowerCase().trim();
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
        <div className="text-gray-600 font-medium">{t('common.score')}: {state.teams.find(t => t.name === teamName)?.score || 0}</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {state.phase === "WAITING" && (
          <div className="space-y-4">
            <Clock className="w-16 h-16 text-blue-500 animate-pulse mx-auto" />
            <h2 className="text-2xl font-bold text-gray-800">{t('player.waiting_host')}</h2>
            <p className="text-gray-500">{t('player.get_ready')}</p>
          </div>
        )}

        {state.phase === "QUESTION_PREVIEW" && state.currentQuestion && (
          <div className="w-full max-w-2xl space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-md border-b-4 border-yellow-500">
              <span className="text-yellow-600 font-bold uppercase tracking-wider text-sm">{t('player.upcoming_question')}</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-2 text-gray-800">
                {state.currentQuestion.question_text}
              </h2>
            </div>
            <div className="space-y-4">
              <Clock className="w-12 h-12 text-yellow-500 animate-spin-slow mx-auto" />
              <p className="text-xl font-medium text-gray-600">{t('player.host_reading')}</p>
            </div>
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
                {(state.currentQuestion.type === "MULTIPLE_CHOICE" || state.currentQuestion.type === "CLOSED") ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {state.currentQuestion.content.options.map((opt: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => {
                          const teamId = getTeamId();
                          if (!teamId) return;
                          setAnswer(i.toString());
                          setSubmitted(true);
                          socket.emit("SUBMIT_ANSWER", {
                            teamId,
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
                            const teamId = getTeamId();
                            if (!teamId) return;
                            socket.emit("SUBMIT_ANSWER", {
                              teamId,
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
                      className="w-full p-4 text-2xl rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
                      placeholder="Type your answer..."
                    />
                    <button
                      onClick={handleSubmit}
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

        {state.phase === "REVEAL_ANSWER" && state.currentQuestion && (
          <div className="w-full max-w-3xl space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-blue-500 text-left">
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center space-x-2 text-blue-600">
                   <Info className="w-6 h-6" />
                   <span className="font-bold uppercase tracking-widest text-sm">{t('player.reveal_phase')}</span>
                 </div>
                 {isCorrect() ? (
                   <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full font-bold flex items-center">
                     <CheckCircle className="w-4 h-4 mr-2" /> {t('player.correct')}
                   </span>
                 ) : (
                   <span className="bg-red-100 text-red-700 px-4 py-1 rounded-full font-bold flex items-center">
                     <XCircle className="w-4 h-4 mr-2" /> {t('player.incorrect')}
                   </span>
                 )}
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-8">
                {state.currentQuestion.question_text}
              </h2>

              <div className="space-y-6">
                {(state.currentQuestion.type === "MULTIPLE_CHOICE" || state.currentQuestion.type === "CLOSED") ? (
                  <div className="grid grid-cols-1 gap-4">
                    {state.currentQuestion.content?.options?.map((opt: string, i: number) => {
                      const isOptionCorrect = i === state.currentQuestion!.content.correctIndex;
                      const isSelected = i === parseInt(answer);
                      
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
                          <span className={`text-xl font-bold ${isOptionCorrect ? "text-green-800" : isSelected ? "text-red-800" : "text-gray-500"}`}>
                            {opt}
                          </span>
                          <div className="flex items-center space-x-3">
                            {isSelected && (
                              <span className={`text-xs font-black uppercase px-2 py-1 rounded ${isOptionCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                                {t('player.your_choice')}
                              </span>
                            )}
                            {isOptionCorrect && <CheckCircle className="text-green-600 w-8 h-8" />}
                            {isSelected && !isOptionCorrect && <XCircle className="text-red-600 w-8 h-8" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-200">
                      <span className="text-green-600 text-xs font-bold uppercase">{t('player.correct_answer')}</span>
                      <p className="text-2xl font-black text-green-900 mt-1">{getCorrectAnswer()}</p>
                    </div>
                    <div className={`${isCorrect() ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} p-6 rounded-2xl border-2`}>
                      <span className={`${isCorrect() ? "text-green-600" : "text-red-600"} text-xs font-bold uppercase`}>{t('player.your_answer')}</span>
                      <p className={`text-2xl font-black ${isCorrect() ? "text-green-900" : "text-red-900"} mt-1`}>
                        {answer || "(No Answer)"}
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

import React, { useState } from "react";
import { Plus, Trash2, Edit2, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from "lucide-react";
import type { Round, Question } from "@quizco/shared";

interface RoundManagerProps {
  rounds: Round[];
  questionsByRound: Record<string, Question[]>;
  onCreateRound: () => void;
  onEditRound: (round: Round) => void;
  onDeleteRound: (id: string) => void;
  onReorderRound: (id: string, direction: "up" | "down") => void;
  onCreateQuestion: (roundId: string) => void;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onReorderQuestion: (roundId: string, id: string, direction: "up" | "down") => void;
}

export const RoundManager: React.FC<RoundManagerProps> = ({
  rounds,
  questionsByRound,
  onCreateRound,
  onEditRound,
  onDeleteRound,
  onReorderRound,
  onCreateQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onReorderQuestion,
}) => {
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});

  const toggleRound = (id: string) => {
    setExpandedRounds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Rounds</h2>
        <button
          onClick={onCreateRound}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center font-semibold transition"
        >
          <Plus className="mr-2 w-5 h-5" /> Add Round
        </button>
      </div>

      <div className="space-y-4">
        {rounds.map((round, index) => (
          <div
            key={round.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => toggleRound(round.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition"
                >
                  {expandedRounds[round.id] ? <ChevronUp /> : <ChevronDown />}
                </button>
                <div>
                  <h3 className="font-bold text-gray-800">
                    {index + 1}. {round.title}
                  </h3>
                  <span className="text-[10px] font-black uppercase bg-gray-200 text-gray-600 px-2 py-0.5 rounded ml-2">
                    {round.type}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onReorderRound(round.id, "up")}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onReorderRound(round.id, "down")}
                  disabled={index === rounds.length - 1}
                  className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-200 mx-2" />
                <button
                  onClick={() => onEditRound(round)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this round and all its questions?")) {
                      onDeleteRound(round.id);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expandedRounds[round.id] && (
              <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-3 mb-6">
                  {questionsByRound[round.id]?.map((q, qIndex) => (
                    <div
                      key={q.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400 text-sm font-bold w-6">
                          {qIndex + 1}.
                        </span>
                        <div className="flex flex-col">
                          <span className="text-gray-800 font-medium">{q.questionText}</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">{q.type}</span>
                            <span className="text-[10px] text-gray-400">
                              • {q.points} pts • {q.timeLimitSeconds}s
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onReorderQuestion(round.id, q.id, "up")}
                          disabled={qIndex === 0}
                          className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onReorderQuestion(round.id, q.id, "down")}
                          disabled={qIndex === (questionsByRound[round.id]?.length || 0) - 1}
                          className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onEditQuestion(q)}
                          className="p-1 text-gray-400 hover:text-blue-600 ml-2"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this question?")) {
                              onDeleteQuestion(q.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!questionsByRound[round.id] || questionsByRound[round.id].length === 0) && (
                    <p className="text-center py-4 text-gray-400 text-sm italic">
                      No questions yet.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onCreateQuestion(round.id)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-bold flex items-center transition"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Question
                </button>
              </div>
            )}
          </div>
        ))}
        {rounds.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border-2 border-dashed">
            No rounds in this competition.
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Lock, Plus, ChevronRight, Layout, List } from "lucide-react";
import type { Competition, Round } from "@quizco/shared";

const ADMIN_PASSWORD_KEY = "quizco_admin_password";

export const AdminPanel: React.FC = () => {
  const [password, setPassword] = useState(
    localStorage.getItem(ADMIN_PASSWORD_KEY) || ""
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"COMPETITIONS" | "EDITOR">("COMPETITIONS");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [questionsByRound, setQuestionsByRound] = useState<Record<string, any[]>>({});

  const fetchQuestions = useCallback(async (roundId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/admin/rounds/${roundId}/questions`, {
        headers: { "x-admin-auth": password },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestionsByRound(prev => ({ ...prev, [roundId]: data }));
      }
    } catch (err) {
      console.error("Fetch questions error:", err);
    }
  }, [password]);

  const fetchRounds = useCallback(async (compId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/admin/competitions/${compId}/rounds`, {
        headers: { "x-admin-auth": password },
      });
      if (res.ok) {
        const data: Round[] = await res.json();
        setRounds(data);
        data.forEach(r => fetchQuestions(r.id));
      }
    } catch (err) {
      console.error("Fetch rounds error:", err);
    }
  }, [password]);

  useEffect(() => {
    if (selectedComp) {
      fetchRounds(selectedComp.id);
    }
  }, [selectedComp, fetchRounds]);

  const verifyAuth = useCallback(
    async (token?: string) => {
      const authHeader = token || password;
      if (!authHeader) return;

      setIsLoading(true);
      try {
        const res = await fetch("http://localhost:4000/api/admin/competitions", {
          headers: { "x-admin-auth": authHeader },
        });
        if (res.ok) {
          setIsAuthenticated(true);
          const data = await res.json();
          setCompetitions(data);
        } else if (res.status === 401) {
          setIsAuthenticated(false);
          localStorage.removeItem(ADMIN_PASSWORD_KEY);
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [password]
  );

  const createCompetition = async () => {
    const title = prompt("Enter Quiz Title:");
    if (!title) return;

    try {
      const res = await fetch("http://localhost:4000/api/admin/competitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-auth": password,
        },
        body: JSON.stringify({ title, host_pin: "1234" }),
      });
      if (res.ok) {
        verifyAuth();
      }
    } catch (err) {
      console.error("Create error:", err);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_PASSWORD_KEY);
    if (saved) {
      // Use setTimeout to move the call out of the render cycle
      setTimeout(() => verifyAuth(saved), 0);
    }
  }, [verifyAuth]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(ADMIN_PASSWORD_KEY, password);
    verifyAuth(password);
  };

  const createQuestion = async (roundId: string) => {
    const text = prompt("Enter Question Text:");
    if (!text) return;

    try {
      await fetch("http://localhost:4000/api/admin/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-auth": password,
        },
        body: JSON.stringify({
          round_id: roundId,
          question_text: text,
          type: "MULTIPLE_CHOICE",
          points: 10,
          time_limit_seconds: 30,
          content: { options: ["Option A", "Option B"], correct_index: 0 },
          grading: "AUTO"
        }),
      });
      fetchQuestions(roundId);
    } catch (err) {
      console.error("Create question error:", err);
    }
  };

  const createRound = async () => {
    if (!selectedComp) return;
    const title = prompt("Enter Round Title:");
    if (!title) return;

    try {
      await fetch("http://localhost:4000/api/admin/rounds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-auth": password,
        },
        body: JSON.stringify({
          competition_id: selectedComp.id,
          title,
          type: "STANDARD",
          order_index: rounds.length + 1,
        }),
      });
      fetchRounds(selectedComp.id);
    } catch (err) {
      console.error("Create round error:", err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Lock className="text-blue-600 w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Admin Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 outline-none transition mb-4"
            placeholder="Enter Admin Password"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-lg disabled:bg-blue-300"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold flex items-center">
            <Layout className="mr-2" /> Quizco Admin
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setView("COMPETITIONS")}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition ${
              view === "COMPETITIONS" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800"
            }`}
          >
            <List className="mr-3 w-5 h-5" /> Competitions
          </button>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={() => {
                localStorage.removeItem(ADMIN_PASSWORD_KEY);
                setIsAuthenticated(false);
            }}
            className="text-gray-500 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {view === "COMPETITIONS" ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Competitions</h1>
              <button
                onClick={createCompetition}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-semibold"
              >
                <Plus className="mr-2 w-5 h-5" /> New Quiz
              </button>
            </div>

            <div className="grid gap-4">
              {competitions.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition cursor-pointer"
                  onClick={() => {
                    setSelectedComp(comp);
                    setView("EDITOR");
                  }}
                >
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{comp.title}</h3>
                    <p className="text-gray-500 text-sm">Status: {comp.status}</p>
                  </div>
                  <ChevronRight className="text-gray-400" />
                </div>
              ))}
              {competitions.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No competitions found. Create your first one!
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => {
                setView("COMPETITIONS");
                setSelectedComp(null);
                setRounds([]);
              }}
              className="text-blue-600 hover:underline mb-4 flex items-center"
            >
              &larr; Back to Competitions
            </button>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">
                {selectedComp?.title}
              </h1>
              <button
                onClick={createRound}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center font-semibold"
              >
                <Plus className="mr-2 w-5 h-5" /> Add Round
              </button>
            </div>

            <div className="space-y-6">
              {rounds.map((round) => (
                <div key={round.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">
                      Round {round.order_index}: {round.title}
                    </h3>
                    <span className="text-xs font-bold uppercase bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        {round.type}
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4 mb-6">
                        {questionsByRound[round.id]?.map((q) => (
                            <div key={q.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-gray-700 font-medium">{q.question_text}</span>
                                <span className="text-xs font-bold text-blue-600 uppercase">{q.type}</span>
                            </div>
                        ))}
                    </div>
                     <button 
                        onClick={() => createQuestion(round.id)}
                        className="text-sm text-blue-600 hover:underline font-semibold flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Add Question
                     </button>
                  </div>
                </div>
              ))}
              {rounds.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border-2 border-dashed">
                    No rounds in this competition.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Layout,
  List,
  LogOut,
  Settings,
  ChevronLeft,
} from "lucide-react";
import type { Competition, Round, Question } from "@quizco/shared";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CompetitionList } from "./admin/CompetitionList";
import { RoundManager } from "./admin/RoundManager";
import { QuestionEditor } from "./admin/QuestionEditor";

const ADMIN_PASSWORD_KEY = "quizco_admin_password";
const API_BASE = "http://localhost:4000/api/admin";

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
  const [questionsByRound, setQuestionsByRound] = useState<Record<string, Question[]>>({});
  
  const [editingQuestion, setEditingQuestion] = useState<{roundId: string, question: Partial<Question>} | null>(null);

  const fetchQuestions = useCallback(async (roundId: string) => {
    try {
      const res = await fetch(`${API_BASE}/rounds/${roundId}/questions`, {
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
      const res = await fetch(`${API_BASE}/competitions/${compId}/rounds`, {
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
  }, [password, fetchQuestions]);

  const fetchCompetitions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/competitions`, {
        headers: { "x-admin-auth": password },
      });
      if (res.ok) {
        const data = await res.json();
        setCompetitions(data);
        setIsAuthenticated(true);
      } else if (res.status === 401) {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error("Fetch competitions error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [password]);

  useEffect(() => {
    if (password) fetchCompetitions();
  }, [fetchCompetitions, password]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(ADMIN_PASSWORD_KEY, password);
    fetchCompetitions();
  };

  // --- Competition Actions ---
  const handleCreateCompetition = async () => {
    const title = prompt("Enter Quiz Title:");
    if (!title) return;
    const res = await fetch(`${API_BASE}/competitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-auth": password },
      body: JSON.stringify({ title, host_pin: "1234" }),
    });
    if (res.ok) fetchCompetitions();
  };

  const handleUpdateCompetition = async (id: string, data: Partial<Competition>) => {
    const res = await fetch(`${API_BASE}/competitions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-auth": password },
      body: JSON.stringify(data),
    });
    if (res.ok) {
        fetchCompetitions();
        if (selectedComp?.id === id) {
            const updated = await res.json();
            setSelectedComp(updated);
        }
    }
  };

  const handleDeleteCompetition = async (id: string) => {
    const res = await fetch(`${API_BASE}/competitions/${id}`, {
      method: "DELETE",
      headers: { "x-admin-auth": password },
    });
    if (res.ok) fetchCompetitions();
  };

  // --- Round Actions ---
  const handleCreateRound = async () => {
    if (!selectedComp) return;
    const title = prompt("Enter Round Title:");
    if (!title) return;
    const res = await fetch(`${API_BASE}/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-auth": password },
      body: JSON.stringify({
        competition_id: selectedComp.id,
        title,
        type: "STANDARD",
        order_index: rounds.length + 1,
      }),
    });
    if (res.ok) fetchRounds(selectedComp.id);
  };

  const handleUpdateRound = async (id: string, data: Partial<Round>) => {
    const res = await fetch(`${API_BASE}/rounds/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-auth": password },
      body: JSON.stringify(data),
    });
    if (res.ok && selectedComp) fetchRounds(selectedComp.id);
  };

  const handleDeleteRound = async (id: string) => {
    const res = await fetch(`${API_BASE}/rounds/${id}`, {
      method: "DELETE",
      headers: { "x-admin-auth": password },
    });
    if (res.ok && selectedComp) fetchRounds(selectedComp.id);
  };

  const handleReorderRound = async (id: string, direction: "up" | "down") => {
    const index = rounds.findIndex(r => r.id === id);
    if (index === -1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rounds.length) return;

    const roundA = rounds[index];
    const roundB = rounds[newIndex];

    await handleUpdateRound(roundA.id, { ...roundA, order_index: roundB.order_index });
    await handleUpdateRound(roundB.id, { ...roundB, order_index: roundA.order_index });
  };

  // --- Question Actions ---
  const handleSaveQuestion = async (questionData: Partial<Question>) => {
    if (!editingQuestion) return;
    const isNew = !questionData.id;
    const url = isNew ? `${API_BASE}/questions` : `${API_BASE}/questions/${questionData.id}`;
    const method = isNew ? "POST" : "PUT";
    
    const payload = isNew ? { ...questionData, round_id: editingQuestion.roundId } : questionData;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-admin-auth": password },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      fetchQuestions(editingQuestion.roundId);
      setEditingQuestion(null);
    }
  };

  const handleDeleteQuestion = async (id: string, roundId: string) => {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: "DELETE",
      headers: { "x-admin-auth": password },
    });
    if (res.ok) fetchQuestions(roundId);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full shadow-inner">
              <Lock className="text-blue-600 w-10 h-10" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-center mb-2 text-gray-800 tracking-tight">Quizco Admin</h1>
          <p className="text-center text-gray-400 mb-8 font-medium">Enter your credentials to continue</p>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 outline-none transition-all font-medium text-lg bg-gray-50"
              placeholder="Admin Password"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 disabled:bg-blue-300 transform active:scale-95"
            >
              {isLoading ? "Authenticating..." : "Login to Dashboard"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-2xl font-black flex items-center tracking-tighter">
            <Layout className="mr-3 text-blue-500" /> QUIZCO<span className="text-blue-500">.</span>
          </h2>
          <LanguageSwitcher />
        </div>
        <nav className="flex-1 p-6 space-y-3">
          <button
            onClick={() => { setView("COMPETITIONS"); setSelectedComp(null); }}
            className={`w-full flex items-center px-5 py-4 rounded-2xl transition-all font-bold ${
              view === "COMPETITIONS" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <List className="mr-4 w-6 h-6" /> Competitions
          </button>
          <button
            className="w-full flex items-center px-5 py-4 rounded-2xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all font-bold"
          >
            <Settings className="mr-4 w-6 h-6" /> Settings
          </button>
        </nav>
        <div className="p-6 border-t border-gray-800">
          <button 
            onClick={() => {
                localStorage.removeItem(ADMIN_PASSWORD_KEY);
                setIsAuthenticated(false);
            }}
            className="w-full flex items-center justify-center space-x-2 text-gray-500 hover:text-white font-bold py-3 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-auto relative">
        {view === "COMPETITIONS" ? (
          <CompetitionList 
            competitions={competitions}
            onSelect={(comp) => { setSelectedComp(comp); setView("EDITOR"); fetchRounds(comp.id); }}
            onCreate={handleCreateCompetition}
            onEdit={(comp) => {
                const newTitle = prompt("New Title:", comp.title);
                if (newTitle) handleUpdateCompetition(comp.id, { title: newTitle });
            }}
            onDelete={handleDeleteCompetition}
          />
        ) : (
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => { setView("COMPETITIONS"); setSelectedComp(null); setRounds([]); }}
              className="group text-blue-600 hover:text-blue-800 mb-6 flex items-center font-bold transition-all"
            >
              <ChevronLeft className="mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Quizzes
            </button>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-10 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        {selectedComp?.title}
                    </h1>
                    <div className="flex items-center space-x-3 mt-2">
                        <span className="text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            ID: {selectedComp?.id.substring(0,8)}...
                        </span>
                        <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                            selectedComp?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {selectedComp?.status}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        const newStatus = selectedComp?.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
                        if (selectedComp) handleUpdateCompetition(selectedComp.id, { status: newStatus as any });
                    }}
                    className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
                >
                    {selectedComp?.status === 'ACTIVE' ? 'Deactivate' : 'Publish Quiz'}
                </button>
            </div>

            <RoundManager 
              rounds={rounds}
              questionsByRound={questionsByRound}
              onCreateRound={handleCreateRound}
              onEditRound={(round) => {
                  const newTitle = prompt("New Title:", round.title);
                  if (newTitle) handleUpdateRound(round.id, { title: newTitle });
              }}
              onDeleteRound={handleDeleteRound}
              onReorderRound={handleReorderRound}
              onCreateQuestion={(roundId) => setEditingQuestion({ roundId, question: {} })}
              onEditQuestion={(q) => setEditingQuestion({ roundId: q.round_id, question: q })}
              onDeleteQuestion={(id) => {
                  const roundId = rounds.find(r => questionsByRound[r.id]?.find(q => q.id === id))?.id;
                  if (roundId) handleDeleteQuestion(id, roundId);
              }}
              onReorderQuestion={(roundId, id, dir) => {
                  const qs = questionsByRound[roundId];
                  const index = qs.findIndex(q => q.id === id);
                  // Since questions don't have order_index in DB yet (ordered by created_at in API)
                  // For now we'll just log or we could add order_index to questions too.
                  console.log("Reorder question", id, dir);
                  alert("Question reordering requires 'order_index' in DB. Currently ordered by creation time.");
              }}
            />
          </div>
        )}

        {editingQuestion && (
            <QuestionEditor 
                question={editingQuestion.question}
                onSave={handleSaveQuestion}
                onCancel={() => setEditingQuestion(null)}
            />
        )}
      </main>
    </div>
  );
};

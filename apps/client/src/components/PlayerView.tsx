import React, { useState, useRef, useCallback } from "react";
import { useGame } from "../contexts/GameContext";
import { socket, API_URL } from "../socket";
import { Send, Clock, CheckCircle, XCircle, Info, LogOut, Trophy, ChevronRight } from "lucide-react";
import { CrosswordPlayer } from "./player/CrosswordPlayer";
import { FillInTheBlanksPlayer } from "./player/FillInTheBlanksPlayer";
import { MatchingPlayer } from "./player/MatchingPlayer";
import { ChronologyPlayer } from "./player/ChronologyPlayer";
import TrueFalsePlayer from "./player/TrueFalsePlayer";
import CorrectTheErrorPlayer from "./player/CorrectTheErrorPlayer";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { Competition, MultipleChoiceQuestion, MultipleChoiceContent, FillInTheBlanksContent, MatchingContent, AnswerContent, ChronologyContent, ChronologyItem, CorrectTheErrorContent, CrosswordContent, CrosswordClue } from "@quizco/shared";

const TEAM_ID_KEY = "quizco_team_id";
const TEAM_NAME_KEY = "quizco_team_name";
const TEAM_COLOR_KEY = "quizco_team_color";
const SELECTED_COMP_ID_KEY = "quizco_selected_competition_id";

interface CardPosition {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerY: number;
}

export const PlayerView: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(localStorage.getItem(SELECTED_COMP_ID_KEY));

  const [teamName, setTeamName] = useState(localStorage.getItem(TEAM_NAME_KEY) || "");
  const [color, setColor] = useState(localStorage.getItem(TEAM_COLOR_KEY) || "#3B82F6");
  const [joined, setJoined] = useState(false);
  const [answer, setAnswer] = useState<AnswerContent>("");
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success" | "error">("idle");
  const [isReconnecting, setIsReconnecting] = useState(true);

  // State and Refs for the revealing phase of question type "MATCHING"
  const [matchingRevealPositions, setMatchingRevealPositions] = useState<{
    left: Record<string, CardPosition>;
    right: Record<string, CardPosition>;
  }>({ left: {}, right: {} });
  const matchingRevealContainerRef = useRef<HTMLDivElement>(null);
  const matchingRevealLeftRefs = useRef<Record<string, HTMLDivElement>>({});
  const matchingRevealRightRefs = useRef<Record<string, HTMLDivElement>>({});

  const teamId = state.teams.find(t => t.name === teamName)?.id || localStorage.getItem(TEAM_ID_KEY);
  const currentTeam = state.teams.find(t => t.id === teamId);
  const hasSubmitted = submitted || (currentTeam?.lastAnswer !== null && currentTeam?.lastAnswer !== undefined);

  // Fetch active competitions if none selected
  React.useEffect(() => {
    if (!selectedCompId) {
      fetch(`${API_URL}/api/competitions`)
        .then((res) => res.json())
        .then((data) => setCompetitions(data));
    }
  }, [selectedCompId]);

  // Attempt reconnection on mount
  React.useEffect(() => {
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
    document.title = "BC Player";

    if (state.currentQuestion) {
      if (state.currentQuestion.type === "FILL_IN_THE_BLANKS") {
        setAnswer([]);
      } else if (state.currentQuestion.type === "MATCHING") {
        setAnswer({});
      } else if (state.currentQuestion.type === "CHRONOLOGY") {
        // Initialize with IDs from current shuffled items
        setAnswer((state.currentQuestion.content as ChronologyContent).items.map(i => i.id));
      } else if (state.currentQuestion.type === "TRUE_FALSE") {
        setAnswer(null as any); // Use null to indicate no selection yet
      } else if (state.currentQuestion.type === "CORRECT_THE_ERROR") {
        setAnswer({ selectedPhraseIndex: -1, correction: "" });
      } else {
        setAnswer("");
      }
      setSelectedIndices([]);
      setSubmitted(false);
      setSubmissionStatus("idle");
    }
  }, [state.currentQuestion?.id]);

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

  const submitAnswer = (value: AnswerContent) => {
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
    }, (res?: { success: boolean }) => {
      if (res && res.success) {
        setSubmissionStatus("success");
      } else {
        setSubmissionStatus("error");
      }
    });

    setSubmitted(true);
  };

  const toggleIndex = (index: number) => {
    if (hasSubmitted) return;

    const isMultipleChoice = state.currentQuestion?.type === "MULTIPLE_CHOICE";
    const content = state.currentQuestion?.content as MultipleChoiceContent;
    const isSingleChoice = isMultipleChoice && content?.correctIndices?.length === 1;

    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      if (isSingleChoice) {
        return [index];
      }
      return [...prev, index];
    });
  };

  // Sync Watchdog: Monitor if joined team is still in server state
  React.useEffect(() => {
    if (joined && !isReconnecting && state.teams.length > 0) {
      const teamId = getTeamId();
      const stillInGame = state.teams.some(t => t.id === teamId || t.name === teamName);

      if (!stillInGame) {
        console.warn("Session drift detected: Team not found in server state.");
      }
    }
  }, [state.teams, joined, isReconnecting]);

  // Update card positions for the reveal phase of question type "MATCHING"
  const updateMatchingRevealPositions = useCallback(() => {
    if (!matchingRevealContainerRef.current || !state.currentQuestion || state.currentQuestion.type !== "MATCHING") return;

    const containerRect = matchingRevealContainerRef.current.getBoundingClientRect();
    const newPositions = { left: {} as Record<string, CardPosition>, right: {} as Record<string, CardPosition> };

    // Get left items and right items from current question
    const matchingContent = state.currentQuestion.content as MatchingContent;
    const leftItems = matchingContent.pairs.map((p) => ({ id: p.id, text: p.left }));
    const rightItems = matchingContent.pairs.map((p) => p.right);

    leftItems.forEach((item) => {
      const el = matchingRevealLeftRefs.current[item.id];
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions.left[item.id] = {
          left: rect.left - containerRect.left,
          right: rect.right - containerRect.left,
          top: rect.top - containerRect.top,
          bottom: rect.bottom - containerRect.top,
          centerY: (rect.top + rect.bottom) / 2 - containerRect.top,
        };
      }
    });

    rightItems.forEach((text) => {
      const el = matchingRevealRightRefs.current[text];
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions.right[text] = {
          left: rect.left - containerRect.left,
          right: rect.right - containerRect.left,
          top: rect.top - containerRect.top,
          bottom: rect.bottom - containerRect.top,
          centerY: (rect.top + rect.bottom) / 2 - containerRect.top,
        };
      }
    });

    setMatchingRevealPositions(newPositions);
  }, [state.currentQuestion]);

  // Update positions when phase is REVEAL_ANSWER for MATCHING
  React.useEffect(() => {
    if (state.phase === "REVEAL_ANSWER" && state.currentQuestion?.type === "MATCHING") {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(updateMatchingRevealPositions, 100);

      const handleResize = () => updateMatchingRevealPositions();
      window.addEventListener("resize", handleResize);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [state.phase, state.currentQuestion, updateMatchingRevealPositions]);

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
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-md">
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
      return content.correctIndices.map((idx: number) => content.options[idx]).join(", ") || "Unknown";
    }
    if (type === "CLOSED") {
      return content.options[0] || "Unknown";
    }
    if (type === "OPEN_WORD") {
      return content.answer;
    }
    if (type === "CROSSWORD") {
      return t("player.see_grid");
    }
    if (type === "FILL_IN_THE_BLANKS") {
      const fbContent = content as FillInTheBlanksContent;
      return fbContent.blanks.map(b => b.options.find(o => o.isCorrect)?.value || "??").join(", ");
    }
    if (type === "MATCHING") {
      return (content as MatchingContent).pairs.map(p => `${p.left} → ${p.right}`).join(" | ");
    }
    if (type === "CHRONOLOGY") {
      const chrContent = content as ChronologyContent;
      return [...chrContent.items].sort((a, b) => a.order - b.order).map(i => i.text).join(" → ");
    }
    if (type === "TRUE_FALSE") {
      return (content as any).isTrue ? t("game.true") : t("game.false");
    }
    if (type === "CORRECT_THE_ERROR") {
      const cteContent = content as CorrectTheErrorContent;
      return `${cteContent.phrases[cteContent.errorPhraseIndex]} → ${cteContent.correctReplacement}`;
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
            {state.currentQuestion.section && (
              <div className="bg-yellow-100 p-4 rounded-2xl border-2 border-yellow-400 animate-bounce">
                <span className="text-2xl font-black text-yellow-800 uppercase">
                  Turn: {state.currentQuestion.section}
                </span>
              </div>
            )}
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
                    className={`p-8 rounded-3xl border-4 transition-all duration-500 transform ${i < state.revealStep
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
          <div className="w-full max-w-3xl space-y-8">
            {state.currentQuestion.section && (
              <div className="bg-yellow-100 p-4 rounded-2xl border-2 border-yellow-400">
                <span className="text-2xl font-black text-yellow-800 uppercase">
                  Turn: {state.currentQuestion.section}
                </span>
              </div>
            )}
            {!hasSubmitted ? (
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-2xl shadow-md border-b-4 border-blue-500">
                  <span className="text-blue-600 font-bold uppercase tracking-wider text-sm">Question</span>
                  <h2 className="text-2xl md:text-3xl font-bold mt-2 text-gray-800">
                    {state.currentQuestion.questionText}
                  </h2>
                </div>
                <div className="space-y-6 w-full">
                  {state.currentQuestion.type === "MULTIPLE_CHOICE" ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {state.currentQuestion.content?.options?.map((opt: string, i: number) => {
                          const isSelected = selectedIndices.includes(i);
                          return (
                            <button
                              key={i}
                              onClick={() => toggleIndex(i)}
                              className={`border-4 p-6 rounded-2xl text-xl font-black transition-all transform active:scale-95 text-left flex items-center justify-between ${isSelected
                                ? "bg-blue-600 border-blue-400 text-white shadow-lg translate-y-[-2px]"
                                : "bg-white border-gray-100 text-gray-700 hover:border-blue-200"
                                }`}
                            >
                              <span>{opt}</span>
                              {isSelected && <CheckCircle className="w-6 h-6 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => submitAnswer(selectedIndices)}
                        disabled={selectedIndices.length === 0}
                        className={`w-full py-5 rounded-2xl text-2xl font-black shadow-xl transition-all flex items-center justify-center space-x-3 ${selectedIndices.length > 0
                          ? "bg-green-600 hover:bg-green-700 text-white translate-y-[-4px]"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        <Send className="w-8 h-8" />
                        <span>{t("player.submit_answer")}</span>
                      </button>
                    </div>
                  ) : state.currentQuestion.type === "CROSSWORD" ? (
                    <div className="bg-white p-4 rounded-xl shadow-inner max-h-[60vh] overflow-auto">
                      <CrosswordPlayer
                        data={state.currentQuestion.content}
                        onSubmit={(grid) => {
                          submitAnswer(grid);
                        }}
                      />
                    </div>
                  ) : state.currentQuestion.type === "FILL_IN_THE_BLANKS" ? (
                    <div className="space-y-6">
                      <FillInTheBlanksPlayer
                        content={state.currentQuestion.content}
                        value={(answer as string[]) || []}
                        onChange={(val) => setAnswer(val)}
                      />
                      <button
                        onClick={() => submitAnswer(answer)}
                        className="w-full bg-blue-600 text-white font-bold py-6 rounded-3xl text-3xl flex items-center justify-center space-x-2 shadow-xl hover:bg-blue-700 transition"
                      >
                        <Send className="w-8 h-8" /> <span>{t("player.submit_answer")}</span>
                      </button>
                    </div>
                  ) : state.currentQuestion.type === "MATCHING" ? (
                    <div className="space-y-6">
                      <MatchingPlayer
                        content={state.currentQuestion.content}
                        value={(answer as Record<string, string>) || {}}
                        onChange={(val) => setAnswer(val)}
                      />
                      <button
                        onClick={() => submitAnswer(answer)}
                        disabled={Object.keys(answer || {}).length < (state.currentQuestion.content as MatchingContent).pairs.length}
                        className={`w-full font-bold py-6 rounded-3xl text-3xl flex items-center justify-center space-x-2 shadow-xl transition ${Object.keys(answer || {}).length >= (state.currentQuestion.content as MatchingContent).pairs.length
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        <Send className="w-8 h-8" /> <span>{t("player.submit_answer")}</span>
                      </button>
                    </div>
                  ) : state.currentQuestion.type === "CHRONOLOGY" ? (
                    <div className="space-y-6">
                      <ChronologyPlayer
                        key={state.currentQuestion.id}
                        content={state.currentQuestion.content}
                        onChange={(val) => setAnswer(val)}
                      />
                      <button
                        onClick={() => submitAnswer(answer)}
                        className="w-full bg-blue-600 text-white font-bold py-6 rounded-3xl text-3xl flex items-center justify-center space-x-2 shadow-xl hover:bg-blue-700 transition"
                      >
                        <Send className="w-8 h-8" /> <span>{t("player.submit_answer")}</span>
                      </button>
                    </div>
                  ) : state.currentQuestion.type === "TRUE_FALSE" ? (
                    <TrueFalsePlayer
                      selectedAnswer={answer as boolean | null}
                      disabled={hasSubmitted}
                      onAnswer={(val) => {
                        setAnswer(val);
                        submitAnswer(val);
                      }}
                    />
                  ) : state.currentQuestion.type === "CORRECT_THE_ERROR" ? (
                    <CorrectTheErrorPlayer
                      content={state.currentQuestion.content}
                      onAnswer={(val) => {
                        setAnswer(val);
                        submitAnswer(val);
                      }}
                      disabled={hasSubmitted}
                      initialAnswer={currentTeam?.lastAnswer as any}
                    />
                  ) : (
                    <div className="flex flex-col space-y-4">
                      <input
                        type="text"
                        value={String(answer)}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitAnswer(answer)}
                        className="w-full p-4 text-2xl rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition"
                        placeholder="Type your answer..."
                      />
                      <button
                        onClick={() => submitAnswer(answer)}
                        className="bg-blue-600 text-white font-bold py-4 rounded-xl text-xl flex items-center justify-center space-x-2 shadow-lg"
                      >
                        <Send /> <span>{t("player.submit_answer")}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`p-8 rounded-2xl border-2 ${submissionStatus === "error"
                ? "bg-red-100 border-red-500"
                : (submissionStatus === "success" || (currentTeam?.lastAnswer !== null && currentTeam?.lastAnswer !== undefined))
                  ? "bg-green-100 border-green-500"
                  : "bg-blue-100 border-blue-500"
                }`}>
                {submissionStatus === "error" ? (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-800">{t('player.answer_failed')}</h2>
                  </>
                ) : (
                  <>
                    <CheckCircle className={`w-16 h-16 ${(submissionStatus === "success" || (currentTeam?.lastAnswer !== null && currentTeam?.lastAnswer !== undefined)) ? "text-green-500" : "text-blue-500"} mx-auto mb-4 ${submissionStatus === "idle" && !currentTeam?.lastAnswer ? "animate-pulse" : ""}`} />
                    <h2 className={`text-2xl font-bold ${(submissionStatus === "success" || (currentTeam?.lastAnswer !== null && currentTeam?.lastAnswer !== undefined)) ? "text-green-800" : "text-blue-800"}`}>{t('player.answer_received')}</h2>
                    <p className={(submissionStatus === "success" || (currentTeam?.lastAnswer !== null && currentTeam?.lastAnswer !== undefined)) ? "text-green-700" : "text-blue-700"}>{t('player.waiting_others')}</p>
                  </>
                )}
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
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-b-8 border-blue-600">
              <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
              <h2 className="text-5xl font-black text-gray-900 mb-8">{t('host.leaderboard')}</h2>

              <div className="space-y-4">
                {[...state.teams].sort((a, b) => b.score - a.score).map((team, idx) => (
                  <div key={team.id} className={`flex items-center justify-between p-6 rounded-3xl ${idx === 0 ? "bg-yellow-50 border-4 border-yellow-200" : "bg-gray-50 border-4 border-transparent"
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
                      const lastAnswer = team?.lastAnswer as number[] | null;

                      return question.content.options.map((opt: string, i: number) => {
                        const isOptionCorrect = question.content.correctIndices.includes(i);
                        const isSelected = Array.isArray(lastAnswer) && lastAnswer.includes(i);

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
                              className={`text-xl font-bold ${isOptionCorrect ? "text-green-800" : isSelected ? "text-red-800" : "text-gray-500"
                                }`}
                            >
                              {opt}
                            </span>
                            <div className="flex items-center space-x-3">
                              {isSelected && (
                                <span
                                  className={`text-xs font-black uppercase px-2 py-1 rounded ${isOptionCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
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
                ) : state.currentQuestion.type === "CHRONOLOGY" ? (
                  <div className="space-y-4">
                    {/* Items in submitted order with correctness indicators */}
                    {(() => {
                      const chrContent = state.currentQuestion.content as ChronologyContent;
                      const team = state.teams.find((t) => t.name === teamName);
                      const lastAnswer = team?.lastAnswer as string[] | null;

                      if (!lastAnswer || !Array.isArray(lastAnswer)) {
                        return (
                          <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200">
                            <p className="text-gray-500 text-center font-medium">{t("player.no_answer_submitted")}</p>
                          </div>
                        );
                      }

                      // Map submitted answer to items with their correctness
                      const submittedItems = lastAnswer
                        .map((id) => chrContent.items.find((item) => item.id === id))
                        .filter(Boolean) as ChronologyItem[];

                      return (
                        <div className="space-y-3">
                          {submittedItems.map((item, index) => {
                            const isCorrectPosition = item.order === index;

                            let containerClass = "flex items-center space-x-4 p-5 border-2 rounded-2xl transition-all ";
                            if (isCorrectPosition) {
                              containerClass += "border-green-500 bg-green-50 shadow-md";
                            } else {
                              containerClass += "border-red-500 bg-red-50";
                            }

                            return (
                              <div key={item.id} className={containerClass}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${isCorrectPosition ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                  }`}>
                                  {index + 1}
                                </div>
                                <span className={`flex-1 text-xl font-bold ${isCorrectPosition ? "text-green-900" : "text-red-900"
                                  }`}>
                                  {item.text}
                                </span>
                                {isCorrectPosition ? (
                                  <CheckCircle className="text-green-600 w-8 h-8" />
                                ) : (
                                  <div className="text-right">
                                    <XCircle className="text-red-600 w-8 h-8" />
                                    <span className="text-xs font-medium text-red-700">
                                      {t("player.should_be")} #{item.order + 1}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : state.currentQuestion.type === "MATCHING" ? (
                  <div className="w-full" ref={matchingRevealContainerRef}>
                    {(() => {
                      const matchingContent = state.currentQuestion.content as MatchingContent;
                      const team = state.teams.find((t) => t.name === teamName);
                      const lastAnswer = team?.lastAnswer as Record<string, string> | null;

                      if (!lastAnswer || typeof lastAnswer !== "object" || Object.keys(lastAnswer).length === 0) {
                        return (
                          <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200">
                            <p className="text-gray-500 text-center font-medium">{t("player.no_answer_submitted")}</p>
                          </div>
                        );
                      }

                      // Build a map of correct matches: leftId -> rightText
                      const correctMatches: Record<string, string> = {};
                      matchingContent.pairs.forEach((pair) => {
                        correctMatches[pair.id] = pair.right;
                      });

                      // Get left items and right items in a stable order
                      const leftItems = matchingContent.pairs.map((p) => ({ id: p.id, text: p.left }));
                      const rightItems = matchingContent.pairs.map((p) => p.right);

                      return (
                        <div className="relative">
                          {/* SVG layer for arrows - positioned behind cards */}
                          <svg
                            className="absolute inset-0 pointer-events-none"
                            style={{ zIndex: 0 }}
                            width="100%"
                            height="100%"
                          >
                            {/* Render paths using actual card positions */}
                            {leftItems.map((leftItem) => {
                              const userRightText = lastAnswer[leftItem.id];
                              const correctRightText = correctMatches[leftItem.id];
                              const isCorrect = userRightText === correctRightText;

                              if (!userRightText) return null;

                              const leftPos = matchingRevealPositions.left[leftItem.id];
                              const rightPos = matchingRevealPositions.right[userRightText];

                              if (!leftPos || !rightPos) return null;

                              const startX = leftPos.right;
                              const startY = leftPos.centerY;
                              const endX = rightPos.left;
                              const endY = rightPos.centerY;

                              // Calculate control points for a curved bezier path
                              const curvature = 30;

                              // Create a smooth S-curve
                              const path = `M ${startX} ${startY} C ${startX + curvature} ${startY}, ${endX - curvature} ${endY}, ${endX} ${endY}`;

                              return (
                                <g key={`${leftItem.id}-${userRightText}`}>
                                  {/* Shadow/glow effect */}
                                  <path
                                    d={path}
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                  />
                                  {/* Main arrow line */}
                                  <path
                                    d={path}
                                    fill="none"
                                    stroke={isCorrect ? "#22c55e" : "#ef4444"}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                  />
                                </g>
                              );
                            })}
                          </svg>

                          {/* Cards grid - positioned above SVG */}
                          <div className="grid grid-cols-2 gap-16 relative" style={{ zIndex: 1 }}>
                            {/* Left side cards */}
                            <div className="space-y-4">
                              {leftItems.map((item) => {
                                const userRightText = lastAnswer[item.id];
                                const correctRightText = correctMatches[item.id];
                                const isCorrect = userRightText === correctRightText;

                                let cardClass = "w-full p-4 rounded-2xl text-lg font-bold border-4 transition-all flex items-center justify-between ";
                                if (isCorrect) {
                                  cardClass += "bg-green-50 border-green-500 text-green-900 shadow-md";
                                } else if (userRightText) {
                                  cardClass += "bg-red-50 border-red-500 text-red-900 shadow-md";
                                } else {
                                  cardClass += "bg-gray-50 border-gray-200 text-gray-500";
                                }

                                return (
                                  <div
                                    key={item.id}
                                    ref={(el) => { if (el) matchingRevealLeftRefs.current[item.id] = el; }}
                                    className={cardClass}
                                  >
                                    <span>{item.text}</span>
                                    {userRightText && (
                                      isCorrect ? (
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                      ) : (
                                        <XCircle className="w-6 h-6 text-red-600" />
                                      )
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Right side cards - show user's selections */}
                            <div className="space-y-4">
                              {rightItems.map((text) => {
                                // Find which left item this right item is connected to
                                const connectedLeftId = Object.keys(lastAnswer).find(
                                  (key) => lastAnswer[key] === text
                                );
                                const isMatched = !!connectedLeftId;
                                const isCorrect = isMatched && lastAnswer[connectedLeftId] === correctMatches[connectedLeftId];

                                let cardClass = "w-full p-4 rounded-2xl text-lg font-bold border-4 transition-all ";
                                if (isMatched) {
                                  if (isCorrect) {
                                    cardClass += "bg-green-50 border-green-500 text-green-900 shadow-md";
                                  } else {
                                    cardClass += "bg-red-50 border-red-500 text-red-900 shadow-md";
                                  }
                                } else {
                                  cardClass += "bg-gray-50 border-gray-200 text-gray-400";
                                }

                                return (
                                  <div
                                    key={text}
                                    ref={(el) => { if (el) matchingRevealRightRefs.current[text] = el; }}
                                    className={cardClass}
                                  >
                                    <span>{text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Show correct answers summary */}
                          <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                            <p className="text-sm font-bold text-gray-600 mb-2">{t('player.correct_answer')}:</p>
                            <div className="flex flex-wrap gap-2">
                              {matchingContent.pairs.map((pair) => (
                                <span
                                  key={pair.id}
                                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                                >
                                  {pair.left} → {pair.right}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : state.currentQuestion.type === "FILL_IN_THE_BLANKS" ? (
                  <div className="space-y-6">
                    {(() => {
                      const fbContent = state.currentQuestion.content as FillInTheBlanksContent;
                      const team = state.teams.find((t) => t.name === teamName);
                      const lastAnswer = team?.lastAnswer as string[] | null;

                      // Parse the question text to extract parts and blanks
                      const parts = fbContent.text.split(/(\{?\d+\}?)/g);

                      return (
                        <div className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-blue-500 text-left leading-loose text-2xl font-medium text-gray-800">
                          {parts.map((part, i) => {
                            const match = part.match(/\{?(\d+)\}?/);
                            if (match) {
                              const index = parseInt(match[1]);
                              const blankConfig = fbContent.blanks[index];
                              if (!blankConfig) return <span key={i} className="text-red-500">[{part}]</span>;

                              // Get user's answer for this blank
                              const userAnswer = lastAnswer && lastAnswer[index] ? lastAnswer[index] : null;
                              // Get the correct answer
                              const correctOption = blankConfig.options.find(o => o.isCorrect);
                              const correctAnswer = correctOption ? correctOption.value : "??";
                              const isCorrect = userAnswer === correctAnswer;

                              let containerClass = "inline-flex items-center mx-2 px-4 py-2 border-b-4 rounded-lg transition-all ";
                              if (isCorrect) {
                                containerClass += "bg-green-50 border-green-500 text-green-900";
                              } else if (userAnswer) {
                                containerClass += "bg-red-50 border-red-500 text-red-900";
                              } else {
                                containerClass += "bg-gray-50 border-gray-300 text-gray-400";
                              }

                              return (
                                <span key={i} className={containerClass}>
                                  <span className="mr-2">
                                    {userAnswer || "(No answer)"}
                                  </span>
                                  {isCorrect ? (
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                  ) : userAnswer ? (
                                    <XCircle className="w-6 h-6 text-red-600" />
                                  ) : null}
                                </span>
                              );
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </div>
                      );
                    })()}

                    {/* Show correct answers summary */}
                    <div className="p-6 bg-gray-50 rounded-2xl">
                      <p className="text-sm font-bold text-gray-600 mb-3">{t('player.correct_answer')}:</p>
                      <div className="flex flex-wrap gap-3">
                        {(() => {
                          const fbContent = state.currentQuestion.content as FillInTheBlanksContent;
                          return fbContent.blanks.map((blank, idx) => {
                            const correctOption = blank.options.find(o => o.isCorrect);
                            return (
                              <span
                                key={idx}
                                className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-lg font-bold"
                              >
                                #{idx + 1}: {correctOption?.value || "??"}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                ) : state.currentQuestion.type === "CROSSWORD" ? (
                  <div className="space-y-6">
                    {(() => {
                      const crosswordContent = state.currentQuestion.content as CrosswordContent;
                      const team = state.teams.find((t) => t.name === teamName);
                      const userGrid = team?.lastAnswer as string[][] | null;
                      const correctGrid = crosswordContent.grid;

                      // If no answer submitted
                      if (!userGrid || !Array.isArray(userGrid) || userGrid.length === 0) {
                        return (
                          <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200">
                            <p className="text-gray-500 text-center font-medium">{t("player.crossword_no_answer")}</p>
                          </div>
                        );
                      }

                      // Calculate cell numbers (same logic as CrosswordPlayer)
                      const cellToNumber = new Map<string, number>();
                      const allClues = [...(crosswordContent.clues.across || []), ...(crosswordContent.clues.down || [])];
                      const uniqueStarts = new Map<string, CrosswordClue[]>();
                      allClues.forEach(clue => {
                        const key = `${clue.y}-${clue.x}`;
                        if (!uniqueStarts.has(key)) {
                          uniqueStarts.set(key, []);
                        }
                        uniqueStarts.get(key)!.push(clue);
                      });
                      uniqueStarts.forEach((clues, key) => {
                        cellToNumber.set(key, clues[0].number);
                      });

                      // Check word correctness
                      const checkWordCorrectness = (clue: CrosswordClue): boolean => {
                        const userAnswer: string[] = [];
                        const correctAnswer: string[] = clue.answer.split("");

                        let x = clue.x;
                        let y = clue.y;

                        for (let i = 0; i < clue.answer.length; i++) {
                          if (y < userGrid.length && x < userGrid[y].length) {
                            userAnswer.push(userGrid[y][x]?.toUpperCase() || "");
                          }
                          if (clue.direction === "across") {
                            x++;
                          } else {
                            y++;
                          }
                        }

                        return userAnswer.join("") === clue.answer.toUpperCase();
                      };

                      // Collect all clues with their correctness
                      const acrossWords = crosswordContent.clues.across.map(clue => ({
                        ...clue,
                        isCorrect: checkWordCorrectness(clue)
                      }));
                      const downWords = crosswordContent.clues.down.map(clue => ({
                        ...clue,
                        isCorrect: checkWordCorrectness(clue)
                      }));

                      const totalWords = acrossWords.length + downWords.length;
                      const correctWords = acrossWords.filter(w => w.isCorrect).length + downWords.filter(w => w.isCorrect).length;

                      return (
                        <>
                          {/* Words counter */}
                          <div className="text-center p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                            <p className="text-xl font-bold text-blue-800">
                              {t("player.crossword_words_guessed", { correct: correctWords, total: totalWords })}
                            </p>
                          </div>

                          {/* User's grid with color coding */}
                          <div className="bg-white p-6 rounded-3xl shadow-xl border-b-8 border-blue-500">
                            <h3 className="text-lg font-bold text-gray-700 mb-4">{t("player.crossword_your_grid")}</h3>
                            <div
                              className="grid gap-1 bg-gray-300 p-1 rounded shadow-lg mx-auto"
                              style={{
                                gridTemplateColumns: `repeat(${correctGrid[0]?.length || 0}, minmax(0, 1fr))`,
                              }}
                            >
                              {userGrid.map((row, r) =>
                                row.map((cell, c) => {
                                  const cellNumber = cellToNumber.get(`${r}-${c}`);
                                  const correctCell = correctGrid[r]?.[c]?.trim().toUpperCase() || "";
                                  const userCell = cell?.toUpperCase() || "";
                                  const isCorrectChar = correctCell !== "" && userCell === correctCell;
                                  const isWrongChar = correctCell !== "" && userCell !== "" && userCell !== correctCell;

                                  let cellClass = "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center relative ";
                                  if (isCorrectChar) {
                                    cellClass += "bg-green-500 text-white";
                                  } else if (isWrongChar) {
                                    cellClass += "bg-red-500 text-white";
                                  } else if (correctCell === "") {
                                    cellClass += "bg-gray-800";
                                  } else {
                                    cellClass += "bg-white";
                                  }

                                  return (
                                    <div key={`${r}-${c}`} className={cellClass}>
                                      {correctCell !== "" && (
                                        <>
                                          {cellNumber && (
                                            <span className="absolute top-0.5 left-1 text-[8px] md:text-[10px] font-bold text-blue-600 leading-none">
                                              {cellNumber}
                                            </span>
                                          )}
                                          <span className="text-xl font-bold uppercase">{userCell}</span>
                                        </>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Correct words list */}
                          <div className="bg-gray-50 p-6 rounded-2xl">
                            <p className="text-sm font-bold text-gray-600 mb-3">{t('player.crossword_correct_words')}:</p>

                            {acrossWords.length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-bold text-gray-700 border-b mb-2">Across</h4>
                                <div className="flex flex-wrap gap-2">
                                  {acrossWords.map((clue, i) => (
                                    <span
                                      key={`across-${i}`}
                                      className={`px-3 py-1 rounded-full text-sm font-bold ${clue.isCorrect
                                          ? "bg-green-100 text-green-800 border-2 border-green-500"
                                          : "bg-red-100 text-red-800 border-2 border-red-500"
                                        }`}
                                    >
                                      {clue.number}. {clue.answer} {clue.isCorrect ? "✓" : "✗"}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {downWords.length > 0 && (
                              <div>
                                <h4 className="font-bold text-gray-700 border-b mb-2">Down</h4>
                                <div className="flex flex-wrap gap-2">
                                  {downWords.map((clue, i) => (
                                    <span
                                      key={`down-${i}`}
                                      className={`px-3 py-1 rounded-full text-sm font-bold ${clue.isCorrect
                                          ? "bg-green-100 text-green-800 border-2 border-green-500"
                                          : "bg-red-100 text-red-800 border-2 border-red-500"
                                        }`}
                                    >
                                      {clue.number}. {clue.answer} {clue.isCorrect ? "✓" : "✗"}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
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
                      <div className={`text-2xl font-black ${isCorrect() ? "text-green-900" : getGradingStatus() === false ? "text-red-900" : "text-gray-900"} mt-1`}>
                        {(() => {
                          const lastAnswer = state.teams.find((t) => t.name === teamName)?.lastAnswer;
                          if (lastAnswer === null || lastAnswer === undefined || lastAnswer === "") return "(No Answer)";
                          if (lastAnswer === true) return t("game.true");
                          if (lastAnswer === false) return t("game.false");
                          if (Array.isArray(lastAnswer)) return lastAnswer.join(", ");
                          if (typeof lastAnswer === "object") {
                            return Object.values(lastAnswer).join(", ");
                          }
                          return String(lastAnswer);
                        })()}
                      </div>
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

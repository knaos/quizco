import React, { useState, useRef, useCallback } from "react";
import { useGame } from "../contexts/useGame";
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
import { MultipleChoiceReveal } from "./player/MultipleChoiceReveal";
import { ChronologyReveal } from "./player/ChronologyReveal";
import { MatchingReveal } from "./player/MatchingReveal";
import { FillInTheBlanksReveal } from "./player/FillInTheBlanksReveal";
import { CrosswordReveal } from "./player/CrosswordReveal";
import { DefaultReveal } from "./player/DefaultReveal";
import { CorrectTheErrorReveal } from "./player/CorrectTheErrorReveal";
import { useCorrectTheErrorPartialScore } from "./player/useCorrectTheErrorPartialScore";
import { TrueFalseReveal } from "./player/TrueFalseReveal";
import type { Competition, MultipleChoiceQuestion, MultipleChoiceContent, FillInTheBlanksContent, MatchingContent, AnswerContent, ChronologyContent, CorrectTheErrorContent, CrosswordContent, TrueFalseContent, CorrectTheErrorAnswer } from "@quizco/shared";
import { getHydratedPlayerAnswerState } from "./player/playerAnswerSync";
import Button from "./ui/Button";
import { Card } from "./ui/Card";
import Input from "./ui/Input";
import Badge from "./ui/Badge";

const TEAM_ID_KEY = "quizco_team_id";
const TEAM_NAME_KEY = "quizco_team_name";
const TEAM_COLOR_KEY = "quizco_team_color";
const SELECTED_COMP_ID_KEY = "quizco_selected_competition_id";

/**
 * Calculates the partial score for FILL_IN_THE_BLANKS questions.
 * Returns the number of correctly answered blanks.
 */
function calculateFillInTheBlanksScore(
  content: FillInTheBlanksContent,
  answer: string[] | null
): number {
  if (!answer || !Array.isArray(answer)) {
    return 0;
  }

  let correctCount = 0;
  const placeholderCount = content.blanks.length;

  for (let i = 0; i < placeholderCount; i++) {
    const blank = content.blanks[i];
    if (!blank) continue;

    const correctOption = blank.options.find((opt) => opt.isCorrect);
    if (!correctOption) continue;

    const correctVal = correctOption.value.toLowerCase().trim();
    const submittedVal = (answer[i] || "").toLowerCase().trim();

    if (submittedVal === correctVal) {
      correctCount++;
    }
  }

  return correctCount;
}

/**
 * Calculates the partial score for MATCHING questions.
 * Returns the number of correctly matched pairs.
 */
function calculateMatchingScore(
  content: MatchingContent,
  answer: Record<string, string> | null
): number {
  if (!answer || typeof answer !== "object") {
    return 0;
  }

  let correctCount = 0;

  for (const pair of content.pairs) {
    if (answer[pair.id] === pair.right) {
      correctCount++;
    }
  }

  return correctCount;
}

/**
 * Calculates the partial score for CROSSWORD questions.
 * Returns the number of correctly guessed words.
 */
function calculateCrosswordScore(
  content: CrosswordContent,
  answer: string[][] | null
): number {
  if (!answer || !Array.isArray(answer)) {
    return 0;
  }

  // Get all clues (across + down)
  const allClues = [
    ...(content.clues?.across || []),
    ...(content.clues?.down || []),
  ];

  // If there are no clues, fall back to cell-by-cell counting
  if (allClues.length === 0) {
    return 0;
  }

  let correctWordCount = 0;

  for (const clue of allClues) {
    // Extract the word from the player's answer grid
    const word = extractWordFromGrid(
      answer,
      clue.x,
      clue.y,
      clue.direction,
      clue.answer.length
    );

    // Compare (case-insensitive)
    if (word.toUpperCase() === clue.answer.toUpperCase()) {
      correctWordCount++;
    }
  }

  return correctWordCount;
}

/**
 * Extracts a word from the grid at the specified position and direction
 */
function extractWordFromGrid(
  grid: string[][],
  startX: number,
  startY: number,
  direction: "across" | "down",
  length: number
): string {
  let word = "";

  for (let i = 0; i < length; i++) {
    const x = direction === "across" ? startX + i : startX;
    const y = direction === "down" ? startY + i : startY;

    // Check bounds
    if (y >= grid.length || x >= grid[0].length) {
      break;
    }

    const cell = grid[y][x];
    if (cell === undefined || cell === null || cell === "") {
      break;
    }

    word += cell;
  }

  return word;
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
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success" | "error">("idle");
  const [isReconnecting, setIsReconnecting] = useState(true);
  const lastQuestionIdRef = useRef<string | null>(null);
  const lastPartialSubmissionKeyRef = useRef<string | null>(null);

  const teamId = state.teams.find(t => t.name === teamName)?.id || localStorage.getItem(TEAM_ID_KEY);
  const currentTeam = state.teams.find(t => t.id === teamId);
  const hasSubmitted = currentTeam?.isExplicitlySubmitted || false;
  const correctTheErrorTeamAnswer = state.teams.find((t) => t.name === teamName)?.lastAnswer as CorrectTheErrorAnswer | null;
  const correctTheErrorContent = state.currentQuestion?.type === "CORRECT_THE_ERROR"
    ? (state.currentQuestion.content as CorrectTheErrorContent)
    : null;
  const correctTheErrorPartialScore = useCorrectTheErrorPartialScore(
    correctTheErrorContent,
    correctTheErrorTeamAnswer
  );

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

    if (state.currentQuestion && state.currentQuestion.id !== lastQuestionIdRef.current) {
      lastQuestionIdRef.current = state.currentQuestion.id;
      lastPartialSubmissionKeyRef.current = null;
      const hydrated = getHydratedPlayerAnswerState(
        state.currentQuestion,
        currentTeam?.lastAnswer,
      );
      setSelectedIndices(hydrated.selectedIndices);
      setAnswer(hydrated.answer as AnswerContent);
      setSubmissionStatus("idle");
    }
  }, [state.currentQuestion, currentTeam?.lastAnswer]);

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
    if (confirm(t('player.leave_confirm'))) {
      localStorage.removeItem(TEAM_ID_KEY);
      localStorage.removeItem(TEAM_NAME_KEY);
      localStorage.removeItem(TEAM_COLOR_KEY);
      localStorage.removeItem(SELECTED_COMP_ID_KEY);
      window.location.reload(); // Hard reset
    }
  };

  const getTeamId = useCallback(() => {
    return state.teams.find(t => t.name === teamName)?.id || localStorage.getItem(TEAM_ID_KEY);
  }, [state.teams, teamName]);

  const submitAnswer = useCallback((value: AnswerContent, isFinal: boolean = false) => {
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

    if (!isFinal) {
      const partialKey = `${state.currentQuestion.id}:${JSON.stringify(value)}`;
      if (partialKey === lastPartialSubmissionKeyRef.current) {
        return;
      }
      lastPartialSubmissionKeyRef.current = partialKey;
    }

    socket.emit("SUBMIT_ANSWER", {
      competitionId: selectedCompId,
      teamId,
      questionId: state.currentQuestion.id,
      answer: value,
      isFinal
    }, (res?: { success: boolean }) => {
      if (res && res.success) {
        if (isFinal) setSubmissionStatus("success");
      } else {
        if (isFinal) setSubmissionStatus("error");
      }
    });

  }, [selectedCompId, state.currentQuestion, getTeamId, t]);

  const toggleIndex = (index: number) => {
    if (hasSubmitted) return;

    const isMultipleChoice = state.currentQuestion?.type === "MULTIPLE_CHOICE";
    const content = state.currentQuestion?.content as MultipleChoiceContent;
    const isSingleChoice = isMultipleChoice && content?.correctIndices?.length === 1;

    let newIndices: number[];
    if (selectedIndices.includes(index)) {
      newIndices = selectedIndices.filter(i => i !== index);
    } else if (isSingleChoice) {
      newIndices = [index];
    } else {
      newIndices = [...selectedIndices, index];
    }

    setSelectedIndices(newIndices);
    submitAnswer(newIndices, false);
  };

  // Partial sync for other question types
  React.useEffect(() => {
    if (!joined || hasSubmitted || state.phase !== "QUESTION_ACTIVE") return;

    // Use a small timeout for partial sync to avoid spamming for things like OPEN_WORD
    const timer = setTimeout(() => {
      if (state.currentQuestion?.type === "MULTIPLE_CHOICE") {
        // Handled in toggleIndex
      } else if (answer !== "" && answer !== null && answer !== undefined) {
        submitAnswer(answer, false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [answer, joined, hasSubmitted, state.phase, state.currentQuestion?.type, submitAnswer]);

  // Sync Watchdog: Monitor if joined team is still in server state
  React.useEffect(() => {
    if (joined && !isReconnecting && state.teams.length > 0) {
      const teamId = getTeamId();
      const stillInGame = state.teams.some(t => t.id === teamId || t.name === teamName);

      if (!stillInGame) {
        console.warn("Session drift detected: Team not found in server state.");
      }
    }
  }, [state.teams, joined, isReconnecting, getTeamId, teamName]);

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
        <Card className="p-8 shadow-2xl w-full max-w-md border-none">
          <div data-testid="competition-selector">
          <h1 className="text-3xl font-black text-center mb-8 text-gray-800 tracking-tight">{t('player.no_active_quizzes')}</h1>
          <div className="space-y-4">
            {competitions.length === 0 ? (
              <p className="text-center text-gray-500 font-medium">{t('player.no_active_quizzes')}</p>
            ) : (
              competitions.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => handleSelectCompetition(comp.id)}
                  data-testid={`competition-option-${comp.id}`}
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
        </Card>
      </div>
    );
  }

  // Phase 1: Join Team
  if (!joined) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4 relative">
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            onClick={() => { setSelectedCompId(null); localStorage.removeItem(SELECTED_COMP_ID_KEY); }}
            className="text-white/80 hover:text-white flex items-center font-bold p-0 hover:bg-transparent"
          >
            <ChevronRight className="w-5 h-5 rotate-180 mr-1" /> Change Quiz
          </Button>
        </div>
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <Card className="p-8 shadow-xl w-full max-w-md border-none">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">{t('player.join_title')}</h1>
          <form onSubmit={handleJoin} className="space-y-4 text-left" data-testid="join-team-form">
            <Input
              label={t('player.team_name')}
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={t('player.team_name')}
              data-testid="team-name-input"
              required
            />
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider ml-1 mb-1.5">{t('player.pick_color')}</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                data-testid="team-color-input"
                className="w-full h-12 rounded-xl cursor-pointer bg-gray-50 border-2 border-gray-100 p-1"
              />
            </div>
            <Button
              type="submit"
              size="xl"
              className="w-full"
              data-testid="join-team-submit"
            >
              {t('player.lets_go')}
            </Button>
          </form>
        </Card>
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
      return (content as TrueFalseContent).isTrue ? t("game.true") : t("game.false");
    }
    if (type === "CORRECT_THE_ERROR") {
      const cteContent = content as CorrectTheErrorContent;
      const errorPhrase = cteContent.phrases[cteContent.errorPhraseIndex];
      const errorText = typeof errorPhrase === 'object' ? errorPhrase.text : errorPhrase;
      return `${errorText} → ${cteContent.correctReplacement}`;
    }
    return "Unknown";
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
        <div data-testid="player-phase" className="sr-only">{state.phase}</div>
        {(state.phase === "WAITING" || state.phase === "WELCOME") && (
          <div className="space-y-8 animate-in fade-in zoom-in duration-700">
            <Card variant="elevated" className="p-12 rounded-[3rem] border-b-8 border-blue-600">
              <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
              <h2 className="text-5xl font-black text-gray-900 mb-4">{t('player.waiting_host')}</h2>
              <p className="text-2xl text-gray-500 font-bold">{t('player.get_ready')}</p>
            </Card>
          </div>
        )}

        {state.phase === "ROUND_START" && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
            <Card variant="elevated" className="p-16 rounded-[4rem] border-b-8 border-purple-600">
              <span className="text-purple-600 font-black uppercase tracking-[0.3em] text-xl mb-4 block">New Round</span>
              <h2 className="text-6xl font-black text-gray-900 mb-2">
                {state.currentQuestion?.roundId ? "Get Ready!" : "Round Start"}
              </h2>
              <p className="text-3xl text-gray-500 font-bold italic">Prepare your hearts and minds!</p>
            </Card>
          </div>
        )}

        {state.phase === "ROUND_END" && (
          <div className="space-y-8 animate-in zoom-in duration-700">
            <Card variant="elevated" className="p-16 rounded-[4rem] border-b-8 border-green-600">
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
              <h2 className="text-5xl font-black text-gray-900 mb-4">Round Finished!</h2>
              <p className="text-2xl text-gray-500 font-bold">Great job, everyone!</p>
              <div className="mt-8 p-6 bg-green-50 rounded-3xl inline-block">
                <p className="text-green-800 font-black text-xl">Waiting for the next round...</p>
              </div>
            </Card>
          </div>
        )}

        {state.phase === "QUESTION_PREVIEW" && state.currentQuestion && (
          <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
            {state.currentQuestion.section && (
              <Badge variant="yellow" className="p-4 rounded-2xl border-2 border-yellow-400 animate-bounce text-2xl">
                {t('player.turn')}: {state.currentQuestion.section}
              </Badge>
            )}
            <Card variant="elevated" className="p-10 rounded-[2.5rem] border-b-8 border-yellow-500">
              <span className="text-yellow-600 font-black uppercase tracking-widest text-lg mb-4 block">{t('player.upcoming_question')}</span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                {state.currentQuestion.questionText}
              </h2>
            </Card>

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
                    <span className="text-3xl font-black text-gray-800 text-left">{opt}</span>
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
              <Badge variant="yellow" className="p-4 rounded-2xl border-2 border-yellow-400 text-2xl">
                Turn: {state.currentQuestion.section}
              </Badge>
            )}
            {!hasSubmitted ? (
              <div className="space-y-8 text-left">
                <Card className="p-8 border-b-4 border-blue-500">
                  <span className="text-blue-600 font-bold uppercase tracking-wider text-sm">Question</span>
                  <h2 className="text-2xl md:text-3xl font-bold mt-2 text-gray-800" data-testid="player-active-question-text">
                    {state.currentQuestion.questionText}
                  </h2>
                </Card>
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
                              data-testid={`player-choice-${i}`}
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
                      <Button
                        variant="primary"
                        onClick={() => submitAnswer(selectedIndices, true)}
                        disabled={selectedIndices.length === 0}
                        size="xl"
                        data-testid="player-submit-answer"
                        className={`w-full ${selectedIndices.length > 0 ? "translate-y-[-4px]" : ""}`}
                      >
                        <Send className="w-8 h-8 mr-3" />
                        <span>{t("player.submit_answer")}</span>
                      </Button>
                    </div>
                  ) : state.currentQuestion.type === "CROSSWORD" ? (
                    <div className="bg-white p-4 rounded-xl shadow-inner max-h-[60vh] overflow-auto">
                      <CrosswordPlayer
                        data={state.currentQuestion.content}
                        value={answer as string[][]}
                        onChange={(grid) => {
                          setAnswer(grid);
                        }}
                        onSubmit={(grid) => {
                          submitAnswer(grid, true);
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
                      <Button
                        onClick={() => submitAnswer(answer, true)}
                        data-testid="player-submit-answer"
                        className="w-full py-6 rounded-3xl text-3xl shadow-xl"
                      >
                        <Send className="w-8 h-8 mr-2" /> <span>{t("player.submit_answer")}</span>
                      </Button>
                    </div>
                  ) : state.currentQuestion.type === "MATCHING" ? (
                    <div className="space-y-6">
                      <MatchingPlayer
                        content={state.currentQuestion.content}
                        value={(answer as Record<string, string>) || {}}
                        onChange={(val) => setAnswer(val)}
                      />
                      <Button
                        onClick={() => submitAnswer(answer, true)}
                        disabled={Object.keys(answer || {}).length < (state.currentQuestion.content as MatchingContent).pairs.length}
                        data-testid="player-submit-answer"
                        className="w-full py-6 rounded-3xl text-3xl shadow-xl"
                      >
                        <Send className="w-8 h-8 mr-2" /> <span>{t("player.submit_answer")}</span>
                      </Button>
                    </div>
                  ) : state.currentQuestion.type === "CHRONOLOGY" ? (
                    <div className="space-y-6">
                      <ChronologyPlayer
                        key={state.currentQuestion.id}
                        content={state.currentQuestion.content}
                        onChange={(val) => setAnswer(val)}
                      />
                      <Button
                        onClick={() => submitAnswer(answer, true)}
                        data-testid="player-submit-answer"
                        className="w-full py-6 rounded-3xl text-3xl shadow-xl"
                      >
                        <Send className="w-8 h-8 mr-2" /> <span>{t("player.submit_answer")}</span>
                      </Button>
                    </div>
                  ) : state.currentQuestion.type === "TRUE_FALSE" ? (
                    <div className="space-y-6">
                      <TrueFalsePlayer
                        selectedAnswer={answer as boolean | null}
                        disabled={hasSubmitted}
                        onAnswer={(val) => {
                          setAnswer(val);
                        }}
                      />
                      <Button
                        onClick={() => submitAnswer(answer, true)}
                        disabled={answer === null}
                        data-testid="player-submit-answer"
                        className="w-full py-6 rounded-3xl text-3xl shadow-xl"
                      >
                        <Send className="w-8 h-8 mr-2" /> <span>{t("player.submit_answer")}</span>
                      </Button>
                    </div>
                  ) : state.currentQuestion.type === "CORRECT_THE_ERROR" ? (
                    <div className="space-y-6">
                      <CorrectTheErrorPlayer
                        content={state.currentQuestion.content}
                        value={(answer as CorrectTheErrorAnswer) || { selectedPhraseIndex: -1, correction: "" }}
                        onChange={(val) => setAnswer(val)}
                        disabled={hasSubmitted}
                      />
                      {!hasSubmitted && (
                        <Button
                          onClick={() => submitAnswer(answer, true)}
                          disabled={(answer as CorrectTheErrorAnswer).selectedPhraseIndex === -1 || !(answer as CorrectTheErrorAnswer).correction}
                          data-testid="player-submit-answer"
                          className="w-full py-6 rounded-3xl text-3xl shadow-xl"
                        >
                          <Send className="w-8 h-8 mr-2" /> <span>{t("player.submit_answer")}</span>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-4">
                      <Input
                        type="text"
                        value={String(answer)}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitAnswer(answer)}
                        className="text-2xl"
                        placeholder="Type your answer..."
                        data-testid="player-open-answer-input"
                      />
                      <Button
                        onClick={() => submitAnswer(answer, true)}
                        size="lg"
                        data-testid="player-submit-answer"
                        className="shadow-lg"
                      >
                        <Send className="mr-2" /> <span>{t("player.submit_answer")}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`p-8 rounded-2xl border-2 ${submissionStatus === "error"
                ? "bg-red-100 border-red-500"
                : (submissionStatus === "success" || currentTeam?.isExplicitlySubmitted)
                  ? "bg-green-100 border-green-500"
                  : "bg-blue-100 border-blue-500"
                }`} data-testid="player-submission-state">
                {submissionStatus === "error" ? (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-800">{t('player.answer_failed')}</h2>
                  </>
                ) : (
                  <>
                    <CheckCircle className={`w-16 h-16 ${(submissionStatus === "success" || currentTeam?.isExplicitlySubmitted) ? "text-green-500" : "text-blue-500"} mx-auto mb-4 ${submissionStatus === "idle" && !currentTeam?.isExplicitlySubmitted ? "animate-pulse" : ""}`} />
                    <h2 className={`text-2xl font-bold ${(submissionStatus === "success" || currentTeam?.isExplicitlySubmitted) ? "text-green-800" : "text-blue-800"}`}>{t('player.answer_received')}</h2>
                    <p className={(submissionStatus === "success" || currentTeam?.isExplicitlySubmitted) ? "text-green-700" : "text-blue-700"}>{t('player.waiting_others')}</p>
                  </>
                )}
              </div>
            )}


            <div className="text-4xl font-black text-gray-300" data-testid="player-time-remaining">
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
          <div className="w-full max-w-4xl space-y-8 animate-in zoom-in duration-700" data-testid="player-leaderboard">
            <Card variant="elevated" className="p-12 rounded-[3rem] border-b-8 border-blue-600">
              <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
              <h2 className="text-5xl font-black text-gray-900 mb-8">{t('host.leaderboard')}</h2>

              <div className="space-y-4">
                {[...state.teams].sort((a, b) => b.score - a.score).map((team, idx) => (
                  <div key={team.id} data-testid={`leaderboard-team-${team.name}`} className={`flex items-center justify-between p-6 rounded-3xl ${idx === 0 ? "bg-yellow-50 border-4 border-yellow-200" : "bg-gray-50 border-4 border-transparent"
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
            </Card>
          </div>
        )}

        {state.phase === "REVEAL_ANSWER" && state.currentQuestion && (
          <div className="w-full max-w-3xl space-y-8 animate-in fade-in zoom-in duration-500">
            <Card className="p-8 border-t-8 border-blue-500 text-left">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2 text-blue-600">
                  <Info className="w-6 h-6" />
                  <span className="font-bold uppercase tracking-widest text-sm">{t("player.reveal_phase")}</span>
                </div>
                {state.currentQuestion.type === "CORRECT_THE_ERROR" ? (
                  // Special handling for CORRECT_THE_ERROR to show partial score
                  (() => {
                    const partialScore = correctTheErrorPartialScore;
                    
                    if (partialScore === 2) {
                      return (
                        <Badge variant="green">
                          <CheckCircle className="w-4 h-4 mr-2" /> 2/2
                        </Badge>
                      );
                    } else if (partialScore === 1) {
                      return (
                        <Badge variant="yellow">
                          <CheckCircle className="w-4 h-4 mr-2" /> 1/2
                        </Badge>
                      );
                    } else {
                      return (
                        <Badge variant="red">
                          <XCircle className="w-4 h-4 mr-2" /> 0/2
                        </Badge>
                      );
                    }
                  })()
                ) : state.currentQuestion.type === "FILL_IN_THE_BLANKS" ? (
                  // Special handling for FILL_IN_THE_BLANKS to show partial score
                  (() => {
                    const fbContent = state.currentQuestion!.content as FillInTheBlanksContent;
                    const teamAnswer = currentTeam?.lastAnswer as string[] | null;
                    const partialScore = calculateFillInTheBlanksScore(fbContent, teamAnswer);
                    const totalBlanks = fbContent.blanks.length;
                    
                    if (partialScore === totalBlanks) {
                      return (
                        <Badge variant="green">
                          <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/{totalBlanks}
                        </Badge>
                      );
                    } else if (partialScore > 0) {
                      return (
                        <Badge variant="yellow">
                          <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/{totalBlanks}
                        </Badge>
                      );
                    } else {
                      return (
                        <Badge variant="red">
                          <XCircle className="w-4 h-4 mr-2" /> {partialScore}/{totalBlanks}
                        </Badge>
                      );
                    }
                  })()
                ) : state.currentQuestion.type === "MATCHING" ? (
                  // Special handling for MATCHING to show partial score
                  (() => {
                    const matchingContent = state.currentQuestion!.content as MatchingContent;
                    const teamAnswer = currentTeam?.lastAnswer as Record<string, string> | null;
                    const partialScore = calculateMatchingScore(matchingContent, teamAnswer);
                    const totalPairs = matchingContent.pairs.length;
                    
                    if (partialScore === totalPairs) {
                      return (
                        <Badge variant="green">
                          <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/{totalPairs}
                        </Badge>
                      );
                    } else if (partialScore > 0) {
                      return (
                        <Badge variant="yellow">
                          <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/{totalPairs}
                        </Badge>
                      );
                    } else {
                      return (
                        <Badge variant="red">
                          <XCircle className="w-4 h-4 mr-2" /> {partialScore}/{totalPairs}
                        </Badge>
                      );
                    }
                  })()
                ) : state.currentQuestion.type === "CROSSWORD" ? (
                  // Special handling for CROSSWORD to show partial score
                  (() => {
                    const crosswordContent = state.currentQuestion!.content as CrosswordContent;
                    const teamAnswer = currentTeam?.lastAnswer as string[][] | null;
                    const partialScore = calculateCrosswordScore(crosswordContent, teamAnswer);
                    const totalWords = (crosswordContent.clues?.across?.length || 0) + (crosswordContent.clues?.down?.length || 0);
                    
                    if (partialScore === totalWords && totalWords > 0) {
                      return (
                        <Badge variant="green">
                          <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/{totalWords}
                        </Badge>
                      );
                    } else if (partialScore > 0 && totalWords > 0) {
                      return (
                        <Badge variant="yellow">
                          <CheckCircle className="w-4 h-4 mr-2" /> {partialScore}/{totalWords}
                        </Badge>
                      );
                    } else if (totalWords === 0) {
                      // Fallback when no clues are defined
                      return getGradingStatus() === true ? (
                        <Badge variant="green">
                          <CheckCircle className="w-4 h-4 mr-2" /> {t("player.correct")}
                        </Badge>
                      ) : (
                        <Badge variant="red">
                          <XCircle className="w-4 h-4 mr-2" /> {t("player.incorrect")}
                        </Badge>
                      );
                    } else {
                      return (
                        <Badge variant="red">
                          <XCircle className="w-4 h-4 mr-2" /> {partialScore}/{totalWords}
                        </Badge>
                      );
                    }
                  })()
                ) : getGradingStatus() === true ? (
                  <Badge variant="green">
                    <CheckCircle className="w-4 h-4 mr-2" /> {t("player.correct")}
                  </Badge>
                ) : getGradingStatus() === false ? (
                  <Badge variant="red">
                    <XCircle className="w-4 h-4 mr-2" /> {t("player.incorrect")}
                  </Badge>
                ) : (
                  <Badge variant="gray">
                    <Clock className="w-4 h-4 mr-2" /> {t("player.waiting_grading")}
                  </Badge>
                )}
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-8">{state.currentQuestion.questionText}</h2>

              <div className="space-y-6">
                {state.currentQuestion.type === "MULTIPLE_CHOICE" ? (
                  <MultipleChoiceReveal
                    question={state.currentQuestion as MultipleChoiceQuestion}
                    lastAnswer={currentTeam?.lastAnswer as number[] | null}
                  />
                ) : state.currentQuestion.type === "CHRONOLOGY" ? (
                  <ChronologyReveal
                    content={state.currentQuestion.content as ChronologyContent}
                    lastAnswer={currentTeam?.lastAnswer as string[] | null}
                  />
                ) : state.currentQuestion.type === "MATCHING" ? (
                  <MatchingReveal
                    content={state.currentQuestion.content as MatchingContent}
                    lastAnswer={currentTeam?.lastAnswer as Record<string, string> | null}
                  />
                ) : state.currentQuestion.type === "FILL_IN_THE_BLANKS" ? (
                  <FillInTheBlanksReveal
                    content={state.currentQuestion.content as FillInTheBlanksContent}
                    lastAnswer={currentTeam?.lastAnswer as string[] | null}
                  />
                ) : state.currentQuestion.type === "CROSSWORD" ? (
                  <CrosswordReveal
                    content={state.currentQuestion.content as CrosswordContent}
                    lastAnswer={currentTeam?.lastAnswer as string[][] | null}
                  />

                ) : state.currentQuestion.type === "CORRECT_THE_ERROR" ? (
                  <CorrectTheErrorReveal
                    content={state.currentQuestion.content as CorrectTheErrorContent}
                    lastAnswer={state.teams.find((t) => t.name === teamName)?.lastAnswer as { selectedPhraseIndex: number; correction: string } | null}
                  />
                ) : state.currentQuestion.type === "TRUE_FALSE" ? (
                  <TrueFalseReveal
                    content={state.currentQuestion.content as TrueFalseContent}
                    lastAnswer={state.teams.find((t) => t.name === teamName)?.lastAnswer as boolean | null}
                  />
                ) : (
                  <DefaultReveal
                    lastAnswer={currentTeam?.lastAnswer}
                    gradingStatus={getGradingStatus()}
                    getCorrectAnswer={getCorrectAnswer}
                  />
                )}
              </div>
            </Card>

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

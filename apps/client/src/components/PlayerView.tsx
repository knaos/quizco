import React, { useState, useRef, useCallback } from "react";
import { useGame } from "../contexts/useGame";
import { socket, API_URL } from "../socket";
import { Clock, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useCorrectTheErrorPartialScore } from "./player/useCorrectTheErrorPartialScore";
import type { Competition, FillInTheBlanksContent, MatchingContent, AnswerContent, ChronologyContent, CorrectTheErrorContent, TrueFalseContent, CorrectTheErrorAnswer, MultipleChoiceContent } from "@quizco/shared";
import { getHydratedPlayerAnswerState } from "./player/playerAnswerSync";
import { CompetitionSelector } from "./player/CompetitionSelector";
import { TeamJoinForm } from "./player/TeamJoinForm";
import { WaitingPhase, RoundTransitionPhase, LeaderboardPhase } from "./player/SimplePhases";
import { QuestionActivePhase } from "./player/QuestionActivePhase";
import { QuestionPreviewPhase } from "./player/QuestionPreviewPhase";
import { RevealAnswerPhase } from "./player/RevealAnswerPhase";

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
      window.location.reload();
    }
  };

  const getTeamId = useCallback(() => {
    return state.teams.find(t => t.name === teamName)?.id || localStorage.getItem(TEAM_ID_KEY);
  }, [state.teams, teamName]);

  const submitAnswer = useCallback((value: AnswerContent, isFinal: boolean = false) => {
    if (!state.currentQuestion || !selectedCompId) return;

    const teamId = getTeamId();
    if (!teamId) {
      alert(t('player.session_lost_rejoin'));
      setJoined(false);
      return;
    }

    if (!isFinal) {
      const partialKey = `${state.currentQuestion.id}:${JSON.stringify(value)}`;
      if (partialKey === lastPartialSubmissionKeyRef.current) return;
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

    const timer = setTimeout(() => {
      if (state.currentQuestion?.type === "MULTIPLE_CHOICE") {
        // Handled in toggleIndex
      } else if (answer !== "" && answer !== null && answer !== undefined) {
        submitAnswer(answer, false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [answer, joined, hasSubmitted, state.phase, state.currentQuestion?.type, submitAnswer]);

  // Sync Watchdog
  React.useEffect(() => {
    if (joined && !isReconnecting && state.teams.length > 0) {
      const teamId = getTeamId();
      const stillInGame = state.teams.some(t => t.id === teamId || t.name === teamName);
      if (!stillInGame) console.warn("Session drift detected: Team not found in server state.");
    }
  }, [state.teams, joined, isReconnecting, getTeamId, teamName]);

  const getCorrectAnswer = () => {
    if (!state.currentQuestion) return "";
    const { type, content } = state.currentQuestion;
    if (type === "MULTIPLE_CHOICE") return content.correctIndices.map((idx: number) => content.options[idx]).join(", ") || "Unknown";
    if (type === "CLOSED") return content.options[0] || "Unknown";
    if (type === "OPEN_WORD") return content.answer;
    if (type === "CROSSWORD") return t("player.see_grid");
    if (type === "FILL_IN_THE_BLANKS") return (content as FillInTheBlanksContent).blanks.map(b => b.options.find(o => o.isCorrect)?.value || "??").join(", ");
    if (type === "MATCHING") return (content as MatchingContent).pairs.map(p => `${p.left} → ${p.right}`).join(" | ");
    if (type === "CHRONOLOGY") return [...(content as ChronologyContent).items].sort((a, b) => a.order - b.order).map(i => i.text).join(" → ");
    if (type === "TRUE_FALSE") return (content as TrueFalseContent).isTrue ? t("game.true") : t("game.false");
    if (type === "CORRECT_THE_ERROR") {
      const cteContent = content as CorrectTheErrorContent;
      const errorPhrase = cteContent.phrases[cteContent.errorPhraseIndex];
      const errorText = typeof errorPhrase === 'object' ? errorPhrase.text : errorPhrase;
      return `${errorText} → ${cteContent.correctReplacement}`;
    }
    return "Unknown";
  };

  const getGradingStatus = (): boolean | undefined => {
    const team = state.teams.find(t => t.name === teamName);
    return team?.lastAnswerCorrect ?? undefined;
  };

  if (isReconnecting) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center">
        <div className="text-white font-bold animate-pulse text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  if (!selectedCompId) {
    return <CompetitionSelector competitions={competitions} onSelect={handleSelectCompetition} />;
  }

  if (!joined) {
    return (
      <TeamJoinForm
        teamName={teamName}
        setTeamName={setTeamName}
        color={color}
        setColor={setColor}
        onSubmit={handleJoin}
        onBack={() => { setSelectedCompId(null); localStorage.removeItem(SELECTED_COMP_ID_KEY); }}
      />
    );
  }

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
        
        {(state.phase === "WAITING" || state.phase === "WELCOME") && <WaitingPhase />}

        {(state.phase === "ROUND_START" || state.phase === "ROUND_END") && (
          <RoundTransitionPhase phase={state.phase} currentQuestion={state.currentQuestion} />
        )}

        {state.phase === "QUESTION_PREVIEW" && <QuestionPreviewPhase state={state} />}

        {state.phase === "QUESTION_ACTIVE" && (
          <QuestionActivePhase
            state={state}
            hasSubmitted={hasSubmitted}
            selectedIndices={selectedIndices}
            answer={answer}
            setAnswer={setAnswer}
            toggleIndex={toggleIndex}
            submitAnswer={submitAnswer}
            submissionStatus={submissionStatus}
            currentTeam={currentTeam}
          />
        )}

        {state.phase === "GRADING" && (
          <div className="space-y-4">
            <Clock className="w-16 h-16 text-orange-500 mx-auto" />
            <h2 className="text-3xl font-bold text-gray-800">{t('player.times_up')}</h2>
            <p className="text-xl text-gray-500">The round has ended. Waiting for the host to reveal the answer...</p>
          </div>
        )}

        {state.phase === "LEADERBOARD" && <LeaderboardPhase teams={state.teams} />}

        {state.phase === "REVEAL_ANSWER" && (
          <RevealAnswerPhase
            state={state}
            currentTeam={currentTeam}
            getGradingStatus={getGradingStatus}
            getCorrectAnswer={getCorrectAnswer}
            correctTheErrorPartialScore={correctTheErrorPartialScore}
            teamName={teamName}
          />
        )}
      </main>
    </div>
  );
};

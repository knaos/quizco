import React, { useEffect, useState } from "react";
import { Clock, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGame } from "../contexts/useGame";
import { CompetitionSelector } from "./player/lobby/CompetitionSelector";
import { TeamJoinForm } from "./player/lobby/TeamJoinForm";
import { WaitingPhase, RoundTransitionPhase, LeaderboardPhase } from "./player/phases/SimplePhases";
import { TimerPausedPhase } from "./player/phases/TimerPausedPhase";
import { QuestionActivePhase } from "./player/phases/QuestionActivePhase";
import { QuestionPreviewPhase } from "./player/phases/QuestionPreviewPhase";
import { RevealAnswerPhase } from "./player/phases/RevealAnswerPhase";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { usePlayerSession } from "../hooks/usePlayerSession";
import { MilestoneProgressBar } from "./player/ui/MilestoneProgressBar";
import { socket } from "../socket";

export const PlayerView: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const session = usePlayerSession(state);
  const [revealedMilestones, setRevealedMilestones] = useState<number[]>(state.revealedMilestones);

   useEffect(() => {
     setRevealedMilestones(state.revealedMilestones);
   }, [state.revealedMilestones]);

   useEffect(() => {
     const handleMilestonesRevealed = (payload: { revealedIndices: number[] }) => {
       setRevealedMilestones((prev) => {
         const merged = [...prev];
         for (const idx of payload.revealedIndices) {
           if (!merged.includes(idx)) merged.push(idx);
         }
         return merged;
       });
     };
     socket.on("MILESTONES_REVEALED", handleMilestonesRevealed);
     return () => {
       socket.off("MILESTONES_REVEALED", handleMilestonesRevealed);
     };
   }, []);

  useEffect(() => {
    document.title = "BC Player";
  }, []);

  if (session.isReconnecting) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center">
        <div className="text-white font-bold animate-pulse text-xl">{t("common.loading")}</div>
      </div>
    );
  }

  if (!session.selectedCompId) {
    return (
      <CompetitionSelector
        competitions={session.competitions}
        onSelect={session.selectCompetition}
      />
    );
  }

  if (!session.joined) {
    return (
      <TeamJoinForm
        teamName={session.identity.teamName}
        setTeamName={session.setTeamName}
        color={session.identity.color}
        setColor={session.setColor}
        onSubmit={(event) => {
          event.preventDefault();
          session.joinTeam();
        }}
        onBack={session.clearSelectedCompetition}
        error={session.loginError ? t(session.loginError) : undefined}
      />
    );
  }

  const totalPoints = state.teams.reduce((sum, team) => sum + team.score, 0);

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: session.identity.color }}
              />
              <span className="font-bold text-lg text-gray-800">
                {session.currentTeam?.name ?? session.identity.teamName}
              </span>
            </div>
          </div>
          <MilestoneProgressBar
            milestones={state.milestones}
            revealedMilestones={revealedMilestones}
            totalPoints={totalPoints}
          />
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setShowLeaveDialog(true)}
              className="text-gray-400 hover:text-red-500 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>


        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div data-testid="player-phase" className="sr-only">
            {state.phase}
          </div>

          {(state.phase === "WAITING" || state.phase === "WELCOME") && <WaitingPhase />}

          {(state.phase === "ROUND_START" || state.phase === "ROUND_END") && (
            <RoundTransitionPhase phase={state.phase} currentQuestion={state.currentQuestion} />
          )}

          {state.phase === "QUESTION_PREVIEW" && <QuestionPreviewPhase state={state} />}

          {state.phase === "QUESTION_ACTIVE" && state.timerPaused && (
            <TimerPausedPhase />
          )}

          {state.phase === "QUESTION_ACTIVE" && !state.timerPaused && (
            <QuestionActivePhase
              state={state}
              hasSubmitted={session.hasSubmitted}
              selectedIndices={session.selectedIndices}
              answer={session.answer}
              setAnswer={session.setAnswer}
              toggleIndex={session.toggleIndex}
              submitAnswer={session.submitAnswer}
              submissionStatus={session.submissionStatus}
              currentTeam={session.currentTeam}
              requestJoker={session.requestJoker}
              jokerUsed={session.jokerUsed}
              jokerRevealedCells={session.jokerRevealedCells}
            />
          )}

          {state.phase === "GRADING" && (
            <div className="space-y-4">
              <Clock className="w-16 h-16 text-orange-500 mx-auto" />
              <h2 className="text-3xl font-bold text-gray-800">{t("player.times_up")}</h2>
              <p className="text-xl text-gray-500">{t("player.grading_waiting")}</p>
            </div>
          )}

          {state.phase === "LEADERBOARD" && <LeaderboardPhase teams={state.teams} />}

          {state.phase === "REVEAL_ANSWER" && (
            <RevealAnswerPhase
              state={state}
              currentTeam={session.currentTeam}
              getGradingStatus={session.getGradingStatus}
              getCorrectAnswer={() =>
                state.currentQuestion ? session.getCorrectAnswer(state.currentQuestion, t) : ""
              }
              correctTheErrorPartialScore={session.correctTheErrorPartialScore}
              teamName={session.currentTeam?.name ?? session.identity.teamName}
            />
          )}
        </main>
      </div>

      {showLeaveDialog ? (
        <ConfirmDialog
          title={t("player.leave_title")}
          message={t("player.leave_confirm")}
          confirmLabel={t("player.leave_action")}
          onCancel={() => setShowLeaveDialog(false)}
          onConfirm={() => {
            setShowLeaveDialog(false);
            session.leaveSession();
          }}
        />
      ) : null}
    </>
  );
};

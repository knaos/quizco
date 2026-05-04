import { describe, expect, it, vi } from "vitest";
import { render, flushEffects, click } from "../../test/render";
import { AnswerHistoryView } from "./AnswerHistoryView";

const baseRecord = {
  answerId: "answer-1",
  competitionId: "comp-1",
  teamId: "team-1",
  teamName: "Team One",
  teamColor: "red",
  questionId: "question-1",
  questionText: "What is faith?",
  roundId: "round-1",
  roundTitle: "Round 1",
  latestSubmittedContent: "Belief",
  latestIsCorrect: true,
  latestScoreAwarded: 4,
  snapshots: [
    {
      id: "snap-1",
      answerId: "answer-1",
      competitionId: "comp-1",
      teamId: "team-1",
      teamName: "Team One",
      questionId: "question-1",
      questionText: "What is faith?",
      roundId: "round-1",
      roundTitle: "Round 1",
      snapshotType: "SUBMISSION_UPDATE" as const,
      actorRole: "SYSTEM" as const,
      submittedContent: "Belief",
      isCorrect: null,
      scoreAwarded: 0,
      createdAt: new Date().toISOString(),
    },
  ],
};

describe("AnswerHistoryView", () => {
  it("renders answer history rows and timeline", async () => {
    const fetchAnswerHistory = vi.fn(async () => [baseRecord]);
    const updateAnswerScore = vi.fn(async () => ({
      answerId: "answer-1",
      scoreAwarded: 3,
    }));

    const view = render(
      <AnswerHistoryView
        competitionId="comp-1"
        fetchAnswerHistory={fetchAnswerHistory}
        updateAnswerScore={updateAnswerScore}
      />,
    );

    await flushEffects();

    expect(view.container.querySelector('[data-testid="admin-answer-history-row-answer-1"]')).not.toBeNull();

    click(view.container.querySelector('[data-testid="admin-answer-history-toggle-answer-1"]') as HTMLElement);

    expect(view.container.querySelector('[data-testid="admin-answer-history-timeline-answer-1"]')).not.toBeNull();

    view.unmount();
  });

  it("submits score update with current score draft", async () => {
    const fetchAnswerHistory = vi.fn(async () => [baseRecord]);
    const updateAnswerScore = vi.fn(async () => ({
      answerId: "answer-1",
      scoreAwarded: 2,
    }));

    const view = render(
      <AnswerHistoryView
        competitionId="comp-1"
        fetchAnswerHistory={fetchAnswerHistory}
        updateAnswerScore={updateAnswerScore}
      />,
    );

    await flushEffects();

    click(view.container.querySelector('[data-testid="admin-answer-history-score-save-answer-1"]') as HTMLElement);

    await flushEffects();

    expect(updateAnswerScore).toHaveBeenCalledWith("comp-1", "answer-1", 4);

    view.unmount();
  });
});

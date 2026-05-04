import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { render, flushEffects, click } from "../../test/render";
import { TeamsMonitorView } from "./TeamsMonitorView";
import type { AdminTeamOption } from "@quizco/shared";

const { on, off, emit } = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
}));

vi.mock("../../socket", () => ({
  socket: { on, off, emit },
}));

function setInputValue(element: Element, value: string): void {
  act(() => {
    const input = element as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("TeamsMonitorView", () => {
  it("persists competition/team selection in URL and localStorage", async () => {
    const view = render(
      <TeamsMonitorView
        competitions={[{ id: "comp-1", title: "Comp" }]}
        fetchCompetitionTeams={vi.fn(async () => [{
          id: "team-1",
          name: "Team",
          color: "red",
        } satisfies AdminTeamOption])}
        fetchTeamAnswers={vi.fn(async () => [])}
        updateAnswerScore={vi.fn(async () => null)}
        authToken="token"
      />,
    );

    await flushEffects();

    setInputValue(
      view.container.querySelector('[data-testid="admin-teams-competition-select"]') as Element,
      "comp-1",
    );
    await flushEffects();
    click(view.container.querySelector('[data-testid="admin-teams-list-item-team-1"]') as HTMLElement);
    await flushEffects();

    expect(window.location.search).toContain("competitionId=comp-1");
    expect(window.location.search).toContain("teamId=team-1");
    expect(window.localStorage.getItem("quizco_admin_teams_competition_id")).toBe("comp-1");
    expect(window.localStorage.getItem("quizco_admin_teams_team_id")).toBe("team-1");

    view.unmount();
  });

  it("validates score adjust modal before submit", async () => {
    const updateAnswerScore = vi.fn(async () => ({ answerId: "a1", scoreAwarded: 3 }));
    const view = render(
      <TeamsMonitorView
        competitions={[{ id: "comp-1", title: "Comp" }]}
        fetchCompetitionTeams={vi.fn(async () => [{
          id: "team-1",
          name: "Team",
          color: "red",
        } satisfies AdminTeamOption])}
        fetchTeamAnswers={vi.fn(async () => [{
          answerId: "a1",
          competitionId: "comp-1",
          teamId: "team-1",
          teamName: "Team",
          teamColor: "red",
          questionId: "q1",
          questionText: "Q",
          roundId: "r1",
          roundTitle: "Round",
          latestSubmittedContent: "Ans",
          latestIsCorrect: true,
          latestScoreAwarded: 5,
          snapshots: [],
        }])}
        updateAnswerScore={updateAnswerScore}
        authToken="token"
      />,
    );

    await flushEffects();

    setInputValue(
      view.container.querySelector('[data-testid="admin-teams-competition-select"]') as Element,
      "comp-1",
    );
    await flushEffects();
    click(view.container.querySelector('[data-testid="admin-teams-list-item-team-1"]') as HTMLElement);
    await flushEffects();
    expect(view.container.querySelector('[data-testid="admin-team-answer-adjust-a1"]')).not.toBeNull();

    click(view.container.querySelector('[data-testid="admin-team-answer-adjust-a1"]') as HTMLElement);
    click(view.container.querySelector('[data-testid="admin-team-adjust-confirm-step"]') as HTMLElement);

    expect(view.container.querySelector('[data-testid="admin-team-adjust-validation-error"]')).not.toBeNull();
    expect(updateAnswerScore).not.toHaveBeenCalled();

    setInputValue(
      view.container.querySelector('[data-testid="admin-team-adjust-score-input"]') as Element,
      "3",
    );
    setInputValue(
      view.container.querySelector('[data-testid="admin-team-adjust-reason-input"]') as Element,
      "manual correction",
    );
    expect(updateAnswerScore).not.toHaveBeenCalled();

    view.unmount();
  });
});

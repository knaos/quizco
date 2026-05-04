import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameManager } from "./GameManager";
import { MockGameRepository } from "./test/mocks/MockGameRepository";
import { TimerService } from "./services/TimerService";
import { Logger } from "./utils/Logger";

describe("GameManager resetCompetition", () => {
  let gameManager: GameManager;
  let repository: MockGameRepository;
  const competitionId = "comp-reset";

  beforeEach(() => {
    vi.useFakeTimers();
    repository = new MockGameRepository();
    gameManager = new GameManager(
      repository,
      new TimerService(),
      new Logger("ResetCompetitionTest"),
    );
  });

  it("keeps teams but clears answers and returns to WAITING phase", async () => {
    const team = await gameManager.addTeam(competitionId, "Team A", "#fff");
    await repository.saveAnswer(team.id, "question-1", "round-1", "A", true, 10);

    await gameManager.setPhase(competitionId, "QUESTION_ACTIVE");
    const stateBeforeReset = gameManager.getState(competitionId);
    expect(stateBeforeReset.teams).toHaveLength(1);
    expect(repository.answers).toHaveLength(1);

    await gameManager.resetCompetition(competitionId);

    const stateAfterReset = gameManager.getState(competitionId);
    expect(stateAfterReset.phase).toBe("WAITING");
    expect(stateAfterReset.currentQuestion).toBeNull();
    expect(stateAfterReset.timeRemaining).toBe(0);
    expect(stateAfterReset.teams).toHaveLength(1);
    expect(stateAfterReset.teams[0]?.name).toBe("Team A");
    expect(stateAfterReset.teams[0]?.score).toBe(0);
    expect(repository.answers).toHaveLength(0);
    expect(repository.teams).toHaveLength(1);
  });
});

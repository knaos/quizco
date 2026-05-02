import { describe, it, expect } from "vitest";
import { GameManager } from "./GameManager";
import { TimerService } from "./services/TimerService";
import { Logger } from "./utils/Logger";
import { MockGameRepository } from "./test/mocks/MockGameRepository";

describe("GameManager snapshots", () => {
  it("creates submission snapshots for each submit update", async () => {
    const repository = new MockGameRepository();
    const manager = new GameManager(repository, new TimerService(), new Logger("SnapshotTest"));

    const competitionId = "comp-1";
    const roundId = "round-1";
    const questionId = "question-1";

    repository.questions.push({
      id: questionId,
      roundId,
      questionText: "Open",
      type: "OPEN_WORD",
      points: 5,
      timeLimitSeconds: 30,
      content: { answer: "faith" },
      grading: "AUTO",
    } as any);

    const team = await manager.addTeam(competitionId, "Team One", "red");
    await manager.startQuestion(competitionId, questionId);
    await manager.startTimer(competitionId, 30, () => {});

    const first = await manager.submitAnswer(
      competitionId,
      team.id,
      questionId,
      "fai",
      false,
    );
    const second = await manager.submitAnswer(
      competitionId,
      team.id,
      questionId,
      "faith",
      true,
    );

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);
    expect(repository.answerSnapshots).toHaveLength(2);
    expect(repository.answerSnapshots[0].snapshotType).toBe("SUBMISSION_UPDATE");
    expect(repository.answerSnapshots[1].snapshotType).toBe("SUBMISSION_UPDATE");
  });

  it("creates grading snapshots during reveal", async () => {
    const repository = new MockGameRepository();
    const manager = new GameManager(repository, new TimerService(), new Logger("SnapshotTest"));

    const competitionId = "comp-2";
    const roundId = "round-2";
    const questionId = "question-2";

    repository.questions.push({
      id: questionId,
      roundId,
      questionText: "TF",
      type: "TRUE_FALSE",
      points: 1,
      timeLimitSeconds: 30,
      content: { isTrue: true },
      grading: "AUTO",
    } as any);

    const team = await manager.addTeam(competitionId, "Team Two", "blue");
    await manager.startQuestion(competitionId, questionId);
    await manager.startTimer(competitionId, 30, () => {});
    await manager.submitAnswer(competitionId, team.id, questionId, true, true);
    await manager.revealAnswer(competitionId);

    expect(repository.answerSnapshots.some((s) => s.snapshotType === "GRADING_UPDATE")).toBe(true);
  });
});

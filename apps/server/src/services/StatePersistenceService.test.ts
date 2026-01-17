import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatePersistenceService } from "./StatePersistenceService";
import fs from "fs/promises";
import { GameState } from "@quizco/shared";

vi.mock("fs/promises");

describe("StatePersistenceService", () => {
  let service: StatePersistenceService;

  beforeEach(() => {
    service = new StatePersistenceService();
    vi.resetAllMocks();
  });

  it("saves state correctly", async () => {
    const sessions = new Map<string, GameState>();
    sessions.set("c1", {
      phase: "WAITING",
      teams: [],
      timeRemaining: 0,
      currentQuestion: null,
      revealStep: 0,
    });

    await service.saveState(sessions);

    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();
    const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
    // Check if the content (2nd argument) contains the phase
    expect(writeCall[1]).toContain("WAITING");
  });

  it("loads state correctly", async () => {
    const mockData = {
      c1: {
        phase: "WAITING",
        teams: [],
        timeRemaining: 0,
        currentQuestion: null,
        revealStep: 0,
      },
    };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));
    // Check if access succeeds
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const sessions = await service.loadState();
    expect(sessions.get("c1")?.phase).toBe("WAITING");
  });

  it("returns empty map if load fails (file not found)", async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error("No file"));
    const sessions = await service.loadState();
    expect(sessions.size).toBe(0);
  });
});

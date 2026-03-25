import { describe, expect, it } from "vitest";
import { buildAudienceAnswerStats } from "./audienceStats";

describe("buildAudienceAnswerStats", () => {
  it("returns hidden when no answers were submitted", () => {
    expect(buildAudienceAnswerStats([])).toBeNull();
  });

  it("returns totals and rounded percentage from submitted answers", () => {
    expect(
      buildAudienceAnswerStats([
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false },
      ]),
    ).toEqual({
      totalSubmitted: 5,
      totalCorrect: 4,
      correctPercentage: 80,
    });
  });
});

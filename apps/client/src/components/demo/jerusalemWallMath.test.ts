import { describe, expect, it } from "vitest";
import { getWallHeight, getWallTier } from "./jerusalemWallMath";

describe("jerusalemWallMath", () => {
  it("scales wall height from score", () => {
    expect(getWallHeight(0, 100)).toBeCloseTo(1.2);
    expect(getWallHeight(50, 100)).toBeCloseTo(4.6);
    expect(getWallHeight(100, 100)).toBeCloseTo(8);
  });

  it("categorizes scores into wall tiers", () => {
    expect(getWallTier(5, 100)).toBe("foundation");
    expect(getWallTier(40, 100)).toBe("rising");
    expect(getWallTier(80, 100)).toBe("fortified");
  });
});


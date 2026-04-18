export type DemoTeam = {
  id: string;
  name: string;
  score: number;
  color: string;
};

export type WallTier = "foundation" | "rising" | "fortified";

export function getWallHeight(score: number, maxScore: number): number {
  if (maxScore <= 0) {
    return 1.2;
  }

  const normalized = Math.min(Math.max(score / maxScore, 0), 1);
  return 1.2 + normalized * 6.8;
}

export function getWallTier(score: number, maxScore: number): WallTier {
  if (maxScore <= 0) {
    return "foundation";
  }

  const ratio = score / maxScore;

  if (ratio >= 0.7) {
    return "fortified";
  }

  if (ratio >= 0.35) {
    return "rising";
  }

  return "foundation";
}


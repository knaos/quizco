import React, { useMemo } from "react";
import { Star, Zap, Trophy, Crown, Target } from "lucide-react";
import type { Milestone } from "@quizco/shared";

interface MilestoneProgressBarProps {
  milestones: Milestone[];
  revealedMilestones: number[];
  totalPoints: number;
}

const PLACEHOLDER_ICONS: Record<string, React.FC<{ className?: string }>> = {
  star: Star,
  zap: Zap,
  trophy: Trophy,
  crown: Crown,
  target: Target,
};

export const MilestoneProgressBar: React.FC<MilestoneProgressBarProps> = ({
  milestones,
  revealedMilestones,
  totalPoints,
}) => {
  const maxThreshold = useMemo(
    () => milestones.reduce((max, m) => Math.max(max, m.threshold), 0),
    [milestones],
  );

  if (milestones.length === 0) {
    return null;
  }

  const progressPercent = maxThreshold > 0
    ? Math.min((totalPoints / maxThreshold) * 100, 100)
    : 0;

  return (
    <div className="bg-white">
      <div className="flex items-end justify-between gap-8 mb-1">
        {milestones.map((milestone, index) => {
          const isRevealed = revealedMilestones.includes(index);
          const isReached = totalPoints >= milestone.threshold;

          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-8 h-8 rounded flex items-center justify-center text-lg font-bold
                  transition-all duration-500
                  ${isRevealed
                    ? "bg-amber-400 text-white"
                    : isReached
                      ? "bg-green-100 text-green-600 border border-green-600 animate-pulse"
                      : "bg-gray-200 text-gray-400"
                  }
                `}
                title={`${milestone.threshold} pts`}
              >
                {isRevealed ? (
                  (() => {
                    const IconComponent = PLACEHOLDER_ICONS[milestone.icon] ?? Star;
                    return <IconComponent className="w-5 h-5" />;
                  })()
                ) : (
                  <span>?</span>
                )}
              </div>
              <span className="text-xs font-medium text-gray-500">
                {milestone.threshold}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex justify-end mt-1">
        <span className="text-xs font-semibold text-gray-600">
          {totalPoints} / {maxThreshold}
        </span>
      </div>
    </div>
  );
};

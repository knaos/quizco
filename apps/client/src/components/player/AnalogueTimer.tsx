import React from "react";

interface AnalogueTimerProps {
  timeRemaining: number;
  totalTime: number;
  testId?: string;
}

export const AnalogueTimer: React.FC<AnalogueTimerProps> = ({
  timeRemaining,
  totalTime,
  testId,
}) => {
  const displayTime = timeRemaining;

  const percentage = totalTime > 0 ? Math.max(0, Math.min(1, displayTime / totalTime)) : 0;

  const getColor = () => {
    if (percentage > 0.3) return "#22c55e";
    if (percentage > 0.15) return "#eab308";
    return "#ef4444";
  };

  const center = 60;
  const radius = 50;
  const strokeWidth = 8;
  const color = getColor();

  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);

  const formatTime = (seconds: number) => {
    const totalSec = Math.ceil(seconds);
    if (totalSec > 60) {
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return totalSec;
  };

  const displayText = formatTime(displayTime);

  const isPulsing = displayTime <= 5 && displayTime > 0;

  return (
    <div
      className="relative drop-shadow-lg"
      style={{
        width: 120,
        height: 120,
        animation: isPulsing ? "scale-pulse ease-in-out 1s infinite" : "none",
      }}
    >
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#d1d5db"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-colors duration-300"
        />
      </svg>

      <div className={`absolute inset-0 flex items-center justify-center font-black text-slate-900 drop-shadow-sm text-3xl`}>
        {displayText}
      </div>
      {testId ? (
        <span className="sr-only" data-testid={testId}>
          {Math.ceil(displayTime)}s
        </span>
      ) : null}
    </div>
  );
};

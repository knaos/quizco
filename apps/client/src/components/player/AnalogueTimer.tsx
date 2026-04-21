import React from "react";

interface AnalogueTimerProps {
  timeRemaining: number;
  totalTime: number;
}

export const AnalogueTimer: React.FC<AnalogueTimerProps> = ({
  timeRemaining,
  totalTime,
}) => {
  const displayTime = timeRemaining;

  const percentage = Math.max(0, Math.min(1, displayTime / totalTime));

  const getColor = () => {
    if (percentage > 0.5) return "#22c55e";
    if (percentage > 0.25) return "#eab308";
    return "#ef4444";
  };

  const center = 60;
  const radius = 60;
  const color = getColor();

  const formatTime = (seconds: number) => {
    if (seconds > 60) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return Math.ceil(seconds);
  };

  const displayText = formatTime(displayTime);

  const getArcPath = (pct: number) => {
    if (pct >= 1) {
      return `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.001} ${center - radius} Z`;
    }
    if (pct <= 0) {
      return "";
    }

    const startAngle = -90;
    const endAngle = startAngle + (pct * 360);
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArcFlag = pct > 0.5 ? 1 : 0;

    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

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
      <svg
        width={120}
        height={120}
        viewBox={`0 0 120 120`}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={"#d1d5db"}
        />
        {percentage > 0 && (
          <path
            d={getArcPath(percentage)}
            fill={color}
            className="transition-colors duration-300"
          />
        )}
      </svg>

      <div className={`absolute inset-0 flex items-center justify-center font-black text-white drop-shadow-lg text-3xl`}>
        {displayText}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { MatchingContent } from "@quizco/shared";

interface MatchingPlayerProps {
  content: MatchingContent;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
  /** When true, shows the same UI but disables all interactions */
  previewMode?: boolean;
}

interface CardPosition {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerY: number;
}

const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const MatchingPlayer: React.FC<MatchingPlayerProps> = ({
  content,
  value,
  onChange,
  disabled,
  previewMode = false,
}) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [cardPositions, setCardPositions] = useState<{
    left: Record<string, CardPosition>;
    right: Record<string, CardPosition>;
  }>({ left: {}, right: {} });

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLButtonElement>>({});
  const rightRefs = useRef<Record<string, HTMLButtonElement>>({});

  const { leftItems, rightItems } = useMemo(() => {
    const left = content.heroes.map((h) => ({ id: h.id, text: h.text }));
    const right = content.stories.map((s) => ({ id: s.id, text: s.text }));

    return {
      leftItems: left,
      rightItems: right,
    };
  }, [content.heroes, content.stories]);

  const updatePositions = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = { left: {} as Record<string, CardPosition>, right: {} as Record<string, CardPosition> };

    leftItems.forEach((item) => {
      const el = leftRefs.current[item.id];
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions.left[item.id] = {
          left: rect.left - containerRect.left,
          right: rect.right - containerRect.left,
          top: rect.top - containerRect.top,
          bottom: rect.bottom - containerRect.top,
          centerY: (rect.top + rect.bottom) / 2 - containerRect.top,
        };
      }
    });

    rightItems.forEach((item) => {
      const el = rightRefs.current[item.id];
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions.right[item.id] = {
          left: rect.left - containerRect.left,
          right: rect.right - containerRect.left,
          top: rect.top - containerRect.top,
          bottom: rect.bottom - containerRect.top,
          centerY: (rect.top + rect.bottom) / 2 - containerRect.top,
        };
      }
    });

    setCardPositions(newPositions);
  }, [leftItems, rightItems]);

  // Update positions when items change or on resize
  useEffect(() => {
    // Small delay to ensure DOM is rendered
    const timer = setTimeout(updatePositions, 50);

    const handleResize = () => updatePositions();
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [leftItems, rightItems, updatePositions]);

  // Also update when value changes (matches are made)
  useEffect(() => {
    const timer = setTimeout(updatePositions, 50);
    return () => clearTimeout(timer);
  }, [value, updatePositions]);

  const createMatch = useCallback((leftId: string, rightId: string) => {
    const newValue = { ...value };
    Object.keys(newValue).forEach((key) => {
      if (newValue[key] === rightId) {
        delete newValue[key];
      }
    });
    newValue[leftId] = rightId;
    onChange(newValue);
  }, [value, onChange]);

  const handleLeftClick = (id: string) => {
    if (disabled || previewMode) return;
    
    if (selectedRight) {
      createMatch(id, selectedRight);
      setSelectedRight(null);
    } else {
      setSelectedLeft(id === selectedLeft ? null : id);
    }
  };

  const handleRightClick = (id: string) => {
    if (disabled || previewMode) return;

    if (selectedLeft) {
      createMatch(selectedLeft, id);
      setSelectedLeft(null);
    } else {
      setSelectedRight(id === selectedRight ? null : id);
    }
  };

  const clearMatch = (leftId: string) => {
    if (disabled || previewMode) return;
    const newValue = { ...value };
    delete newValue[leftId];
    onChange(newValue);
  };

  // Generate SVG arrows for each match
  const renderArrows = () => {
    const arrows: React.ReactElement[] = [];

    Object.entries(value).forEach(([leftId, rightId], index) => {
      const leftPos = cardPositions.left[leftId];
      const rightPos = cardPositions.right[rightId];

      if (leftPos && rightPos) {
        const startX = leftPos.right;
        const startY = leftPos.centerY;
        const endX = rightPos.left;
        const endY = rightPos.centerY;

        // Calculate control points for a curved bezier path
        const curvature = 30 + index * 10; // Vary curvature slightly for visual interest

        // Create a smooth S-curve
        const path = `M ${startX} ${startY} C ${startX + curvature} ${startY}, ${endX - curvature} ${endY}, ${endX} ${endY}`;

        arrows.push(
          <g key={`${leftId}-${rightId}`}>
            {/* Shadow/glow effect */}
            <path
              d={path}
              fill="none"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Main arrow line */}
            <path
              d={path}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        );
      }
    });

    return arrows;
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {/* SVG layer for arrows - positioned behind cards */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
        width="100%"
        height="100%"
      >
        {renderArrows()}
      </svg>

      {/* Cards grid - positioned above SVG */}
      <div className="grid grid-cols-2 gap-16 relative" style={{ zIndex: 1 }}>
        <div className="space-y-4">
          {leftItems.map((item) => (
            <button
              key={item.id}
              ref={(el) => { if (el) leftRefs.current[item.id] = el; }}
              onClick={() => handleLeftClick(item.id)}
              disabled={disabled}
              data-testid={`matching-left-${item.id}`}
              className={`w-full p-4 rounded-2xl text-lg font-bold border-4 transition-all flex items-center justify-between ${selectedLeft === item.id
                ? "bg-blue-600 border-blue-400 text-white shadow-lg translate-y-[-2px]"
                : value[item.id]
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-white border-gray-100 text-gray-700 hover:border-blue-200"
                }`}
            >
              <span>{item.text}</span>
              {value[item.id] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearMatch(item.id);
                  }}
                  className="text-blue-600 hover:text-red-500 ml-2"
                >
                  ✕
                </button>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {rightItems.map((item, rightIndex) => {
            const matchedLeftId = Object.keys(value).find(
              (key) => value[key] === item.id
            );
            const isMatched = !!matchedLeftId;

            return (
              <button
                key={item.id}
                ref={(el) => { if (el) rightRefs.current[item.id] = el; }}
                onClick={() => handleRightClick(item.id)}
                disabled={disabled}
                data-testid={`matching-right-${rightIndex}`}
                className={`w-full p-4 rounded-2xl text-lg font-bold border-4 transition-all text-left ${selectedRight === item.id
                  ? "bg-blue-600 border-blue-400 text-white shadow-lg translate-y-[-2px]"
                  : isMatched
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : selectedLeft || selectedRight
                      ? "bg-white border-blue-200 text-blue-600 animate-pulse"
                      : "bg-white border-gray-100 text-gray-700 hover:border-blue-200"
                  }`}
              >
                <span>{item.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

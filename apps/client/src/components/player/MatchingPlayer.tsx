import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { MatchingContent } from "@quizco/shared";

interface MatchingPlayerProps {
  content: MatchingContent;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
}

interface CardPosition {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerY: number;
}

export const MatchingPlayer: React.FC<MatchingPlayerProps> = ({
  content,
  value,
  onChange,
  disabled,
}) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [cardPositions, setCardPositions] = useState<{
    left: Record<string, CardPosition>;
    right: Record<string, CardPosition>;
  }>({ left: {}, right: {} });

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLButtonElement>>({});
  const rightRefs = useRef<Record<string, HTMLButtonElement>>({});

  const { leftItems, rightItems } = useMemo(() => {
    const left = content.pairs.map((p) => ({ id: p.id, text: p.left }));
    const right = content.pairs.map((p) => p.right);

    const hash = (value: string): number => {
      let result = 0;
      for (let i = 0; i < value.length; i += 1) {
        result = (result * 31 + value.charCodeAt(i)) >>> 0;
      }
      return result;
    };

    return {
      leftItems: [...left].sort((a, b) => hash(a.id) - hash(b.id)),
      rightItems: [...right].sort((a, b) => hash(a) - hash(b)),
    };
  }, [content]);

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

    rightItems.forEach((text) => {
      const el = rightRefs.current[text];
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions.right[text] = {
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

  const handleLeftClick = (id: string) => {
    if (disabled) return;
    setSelectedLeft(id === selectedLeft ? null : id);
  };

  const handleRightClick = (rightText: string) => {
    if (disabled || !selectedLeft) return;

    const newValue = { ...value };
    // Remove any existing match for this right item
    Object.keys(newValue).forEach((key) => {
      if (newValue[key] === rightText) {
        delete newValue[key];
      }
    });

    newValue[selectedLeft] = rightText;
    onChange(newValue);
    setSelectedLeft(null);
  };

  const clearMatch = (leftId: string) => {
    if (disabled) return;
    const newValue = { ...value };
    delete newValue[leftId];
    onChange(newValue);
  };

  // Generate SVG arrows for each match
  const renderArrows = () => {
    const arrows: React.ReactElement[] = [];

    Object.entries(value).forEach(([leftId, rightText], index) => {
      const leftPos = cardPositions.left[leftId];
      const rightPos = cardPositions.right[rightText];

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
          <g key={`${leftId}-${rightText}`}>
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
          {rightItems.map((text) => {
            const matchedLeftId = Object.keys(value).find(
              (key) => value[key] === text
            );
            const isMatched = !!matchedLeftId;

            return (
              <button
                key={text}
                ref={(el) => { if (el) rightRefs.current[text] = el; }}
                onClick={() => handleRightClick(text)}
                disabled={disabled || !selectedLeft}
                className={`w-full p-4 rounded-2xl text-lg font-bold border-4 transition-all text-left ${isMatched
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : selectedLeft
                    ? "bg-white border-blue-200 text-blue-600 animate-pulse"
                    : "bg-gray-50 border-transparent text-gray-400 cursor-not-allowed"
                  }`}
              >
                <span>{text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

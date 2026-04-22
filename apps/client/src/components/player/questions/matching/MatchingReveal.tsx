import React, { useState, useRef, useCallback, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MatchingContent } from "@quizco/shared";

interface CardPosition {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerY: number;
}

interface MatchingRevealProps {
  content: MatchingContent;
  lastAnswer: Record<string, string> | null;
}

/**
 * Reveal component for MATCHING questions.
 * Shows cards with SVG arrows connecting matches.
 * Green = correct match, Red = incorrect match.
 * Includes positioning logic to draw arrows between cards.
 */
export const MatchingReveal: React.FC<MatchingRevealProps> = ({
  content,
  lastAnswer,
}) => {
  const { t } = useTranslation();

  const [positions, setPositions] = useState<{
    left: Record<string, CardPosition>;
    right: Record<string, CardPosition>;
  }>({ left: {}, right: {} });

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLDivElement>>({});
  const rightRefs = useRef<Record<string, HTMLDivElement>>({});

  const updatePositions = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = {
      left: {} as Record<string, CardPosition>,
      right: {} as Record<string, CardPosition>,
    };

    const leftItems = content.heroes.map((h) => ({ id: h.id, text: h.text }));
    const rightItems = content.stories.map((s) => ({ id: s.id, text: s.text }));

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

    setPositions(newPositions);
  }, [content]);

  // Update positions on mount and resize
  useEffect(() => {
    const timer = setTimeout(updatePositions, 100);
    const handleResize = () => updatePositions();
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [updatePositions]);

  // Also update when lastAnswer changes (to ensure positions are correct after state updates)
  useEffect(() => {
    const timer = setTimeout(updatePositions, 100);
    return () => clearTimeout(timer);
  }, [lastAnswer, updatePositions]);

  if (
    !lastAnswer ||
    typeof lastAnswer !== "object" ||
    Object.keys(lastAnswer).length === 0
  ) {
    return (
      <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200">
        <p className="text-gray-500 text-center font-medium">
          {t("player.no_answer_submitted")}
        </p>
      </div>
    );
  }

  // Build a map of correct matches: leftId -> rightId
  const correctMatches: Record<string, string> = {};
  content.stories.forEach((story) => {
    if (story.correspondsTo) {
      correctMatches[story.correspondsTo] = story.id;
    }
  });

  // Get left items and right items in a stable order
  const leftItems = content.heroes.map((h) => ({ id: h.id, text: h.text }));
  const rightItems = content.stories.map((s) => ({ id: s.id, text: s.text }));

  return (
    <div className="w-full" ref={containerRef}>
      <div className="relative">
        {/* SVG layer for arrows - positioned behind cards */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 0 }}
          width="100%"
          height="100%"
        >
          {/* Render paths using actual card positions */}
          {leftItems.map((leftItem) => {
            const userRightId = lastAnswer[leftItem.id];
            const correctRightId = correctMatches[leftItem.id];
            const isCorrect = userRightId === correctRightId;

            if (!userRightId) return null;

            const leftPos = positions.left[leftItem.id];
            const rightPos = positions.right[userRightId];

            if (!leftPos || !rightPos) return null;

            const startX = leftPos.right;
            const startY = leftPos.centerY;
            const endX = rightPos.left;
            const endY = rightPos.centerY;

            // Calculate control points for a curved bezier path
            const curvature = 30;

            // Create a smooth S-curve
            const path = `M ${startX} ${startY} C ${startX + curvature} ${startY}, ${endX - curvature} ${endY}, ${endX} ${endY}`;

            return (
              <g key={`${leftItem.id}-${userRightId}`}>
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
                  stroke={isCorrect ? "#22c55e" : "#ef4444"}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>

        {/* Cards grid - positioned above SVG */}
        <div
          className="grid grid-cols-2 gap-16 relative"
          style={{ zIndex: 1 }}
        >
          {/* Left side cards */}
          <div className="space-y-4">
            {leftItems.map((item) => {
              const userRightId = lastAnswer[item.id];
              const correctRightId = correctMatches[item.id];
              const isCorrect = userRightId === correctRightId;

              let cardClass =
                "w-full p-4 rounded-2xl text-lg font-bold border-4 transition-all flex items-center justify-between ";
              if (isCorrect) {
                cardClass +=
                  "bg-green-50 border-green-500 text-green-900 shadow-md";
              } else if (userRightId) {
                cardClass +=
                  "bg-red-50 border-red-500 text-red-900 shadow-md";
              } else {
                cardClass += "bg-gray-50 border-gray-200 text-gray-500";
              }

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el) leftRefs.current[item.id] = el;
                  }}
                  className={cardClass}
                >
                  <span>{item.text}</span>
                  {userRightId &&
                    (isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    ))}
                </div>
              );
            })}
          </div>

          {/* Right side cards - show user's selections */}
          <div className="space-y-4">
            {rightItems.map((item) => {
              const connectedLeftId = Object.keys(lastAnswer).find(
                (key) => lastAnswer[key] === item.id
              );
              const isMatched = !!connectedLeftId;
              const isCorrect =
                isMatched && lastAnswer[connectedLeftId] === correctMatches[connectedLeftId];

              let cardClass =
                "w-full p-4 rounded-2xl text-lg font-bold border-4 transition-all ";
              if (isMatched) {
                if (isCorrect) {
                  cardClass +=
                    "bg-green-50 border-green-500 text-green-900 shadow-md";
                } else {
                  cardClass +=
                    "bg-red-50 border-red-500 text-red-900 shadow-md";
                }
              } else {
                cardClass += "bg-gray-50 border-gray-200 text-gray-400";
              }

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el) rightRefs.current[item.id] = el;
                  }}
                  className={cardClass}
                >
                  <span>{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Show correct answers summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
          <p className="text-sm font-bold text-gray-600 mb-2">
            {t("player.correct_answer")}:
          </p>
          <div className="flex flex-wrap gap-2">
            {content.heroes.map((hero) => {
              const matchingStory = content.stories.find(
                (s) => s.correspondsTo === hero.id
              );
              return (
                <span
                  key={hero.id}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                >
                  {hero.text} → {matchingStory?.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

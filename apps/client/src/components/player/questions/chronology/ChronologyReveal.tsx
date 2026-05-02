import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChronologyAnswer, ChronologyContent, ChronologyItem } from "@quizco/shared";
import { buildChronologyOrderForGrading } from "./chronologyBoard";
import { QuestionSource } from "../../QuestionSource";

interface ChronologyRevealProps {
  content: ChronologyContent;
  lastAnswer: ChronologyAnswer | null;
  source?: string | null;
}

/**
 * Reveal component for CHRONOLOGY questions.
 * Shows items in submitted order with correctness indicators.
 * Green = correct consecutive run, Red = not in a correct run.
 */
export const ChronologyReveal: React.FC<ChronologyRevealProps> = ({
  content,
  lastAnswer,
  source,
}) => {
  const { t } = useTranslation();

  if (!lastAnswer) {
    return (
      <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200">
        <p className="text-gray-500 text-center font-medium">
          {t("player.no_answer_submitted")}
        </p>
      </div>
    );
  }

  const correctOrderIds = [...content.items]
    .sort((a, b) => a.order - b.order)
    .map((item) => item.id);
  const correctOrderIndex = new Map(
    correctOrderIds.map((id, idx) => [id, idx])
  );

  const submittedIds = buildChronologyOrderForGrading(lastAnswer).filter(
    (id) => correctOrderIds.includes(id)
  );

  const submittedItems = submittedIds
    .map((id) => content.items.find((item) => item.id === id))
    .filter(Boolean) as ChronologyItem[];

  const runs: Array<{ start: number; end: number }> = [];
  let runLength = 1;

  for (let i = 1; i < submittedIds.length; i++) {
    const prevId = submittedIds[i - 1];
    const currId = submittedIds[i];
    const prevOrder = correctOrderIndex.get(prevId) ?? -1;
    const currOrder = correctOrderIndex.get(currId) ?? -1;

    if (currOrder === prevOrder + 1) {
      runLength++;
    } else {
      if (runLength >= 2) {
        runs.push({ start: i - runLength, end: i - 1 });
      }
      runLength = 1;
    }
  }

  if (runLength >= 2) {
    runs.push({ start: submittedIds.length - runLength, end: submittedIds.length - 1 });
  }

  const renderItem = (item: ChronologyItem, isGreen: boolean) => {
    const containerClass = "flex items-center space-x-4 p-5 border-2 rounded-2xl transition-all ";
    if (isGreen) {
      return (
        <div
          key={item.id}
          className={containerClass + "border-green-500 bg-green-50 shadow-md"}
        >
          <span className="flex-1 text-xl font-bold text-green-900">
            {item.text}
          </span>
          <CheckCircle className="text-green-600 w-8 h-8" />
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className={containerClass + "border-red-500 bg-red-50"}
      >
        <span className="flex-1 text-xl font-bold text-red-900">
          {item.text}
        </span>
        <XCircle className="text-red-600 w-8 h-8" />
      </div>
    );
  };

  const elements: React.ReactNode[] = [];
  let lastEnd = -1;

  for (const run of runs) {
    if (run.start > lastEnd + 1) {
      for (let i = lastEnd + 1; i < run.start; i++) {
        elements.push(renderItem(submittedItems[i], false));
      }
    }
    elements.push(
      <div key={`run-${run.start}`} className="space-y-3 rounded-xl border-l-4 border-r-4 border-blue-400 p-2">
        {submittedItems.slice(run.start, run.end + 1).map((item) => {
          return renderItem(item, true);
        })}
      </div>
    );
    lastEnd = run.end;
  }

  if (lastEnd < submittedItems.length - 1) {
    for (let i = lastEnd + 1; i < submittedItems.length; i++) {
      elements.push(renderItem(submittedItems[i], false));
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">{elements}</div>
      <QuestionSource source={source} />
    </div>
  );
};

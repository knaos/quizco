import type { ChronologyAnswer } from "@quizco/shared";

export interface ChronologyBoardState {
  poolIds: string[];
  slotIds: Array<string | null>;
}

export type ChronologyDropTarget =
  | { type: "pool"; index?: number }
  | { type: "slot"; index: number };

/**
 * Creates a fresh chronology board with all items in the left pool.
 */
export const createInitialChronologyBoardState = (
  itemIds: string[],
): ChronologyBoardState => ({
  poolIds: [...itemIds],
  slotIds: itemIds.map(() => null),
});

/**
 * Reconstructs board state from persisted chronology answer data.
 * Unknown ids are ignored and missing ids are appended back to the pool.
 */
export const createChronologyBoardStateFromAnswer = (
  itemIds: string[],
  answer: ChronologyAnswer,
): ChronologyBoardState => {
  const knownIds = new Set(itemIds);

  const normalizedSlotIds = answer.slotIds.map((slotId) =>
    slotId && knownIds.has(slotId) ? slotId : null,
  );

  const slotIds = itemIds.map((_, index) => normalizedSlotIds[index] ?? null);

  const slottedIds = slotIds.filter(
    (slotId): slotId is string => typeof slotId === "string",
  );

  const poolFromAnswer = answer.poolIds.filter(
    (id, index) => knownIds.has(id) && answer.poolIds.indexOf(id) === index,
  );

  const poolIds = poolFromAnswer.filter((id) => !slottedIds.includes(id));
  const missingIds = itemIds.filter(
    (id) => !slottedIds.includes(id) && !poolIds.includes(id),
  );

  return {
    slotIds,
    poolIds: [...poolIds, ...missingIds],
  };
};

const findSlotIndex = (
  slotIds: Array<string | null>,
  itemId: string,
): number => slotIds.findIndex((id) => id === itemId);

/**
 * Applies a drag/drop move transition on chronology board state.
 * The function is pure and returns the same reference when no change is needed.
 */
export const moveChronologyItem = (
  state: ChronologyBoardState,
  activeId: string,
  target: ChronologyDropTarget,
): ChronologyBoardState => {
  const sourceSlotIndex = findSlotIndex(state.slotIds, activeId);
  const isInPool = state.poolIds.includes(activeId);

  if (sourceSlotIndex === -1 && !isInPool) {
    return state;
  }

  if (target.type === "pool") {
    if (sourceSlotIndex === -1 && typeof target.index !== "number") {
      return state;
    }

    const nextPoolIds = state.poolIds.filter((id) => id !== activeId);
    const insertIndex =
      typeof target.index === "number"
        ? Math.max(0, Math.min(target.index, nextPoolIds.length))
        : nextPoolIds.length;

    const insertedPoolIds = [...nextPoolIds];
    insertedPoolIds.splice(insertIndex, 0, activeId);

    if (sourceSlotIndex === -1) {
      if (insertedPoolIds.join("|") === state.poolIds.join("|")) {
        return state;
      }
      return {
        poolIds: insertedPoolIds,
        slotIds: state.slotIds,
      };
    }

    const nextSlotIds = [...state.slotIds];
    nextSlotIds[sourceSlotIndex] = null;
    return {
      poolIds: insertedPoolIds,
      slotIds: nextSlotIds,
    };
  }

  if (target.index < 0 || target.index >= state.slotIds.length) {
    return state;
  }

  if (sourceSlotIndex === target.index) {
    return state;
  }

  const nextPoolIds = state.poolIds.filter((id) => id !== activeId);
  const nextSlotIds = [...state.slotIds];
  const displacedId = nextSlotIds[target.index];

  nextSlotIds[target.index] = activeId;

  if (sourceSlotIndex !== -1) {
    nextSlotIds[sourceSlotIndex] = displacedId;
    return {
      poolIds: nextPoolIds,
      slotIds: nextSlotIds,
    };
  }

  if (displacedId) {
    return {
      poolIds: [...nextPoolIds, displacedId],
      slotIds: nextSlotIds,
    };
  }

  return {
    poolIds: nextPoolIds,
    slotIds: nextSlotIds,
  };
};

export const buildChronologyAnswer = (
  state: ChronologyBoardState,
): ChronologyAnswer => ({
  slotIds: state.slotIds,
  poolIds: state.poolIds,
});

/**
 * Builds the grading order expected by chronology scoring:
 * all placed slot ids first, then remaining pool ids.
 */
export const buildChronologyOrderForGrading = (
  answer: ChronologyAnswer,
): string[] => {
  return answer.slotIds.filter(
    (slotId): slotId is string => typeof slotId === "string",
  );
};

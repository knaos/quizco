import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChronologyAnswer, ChronologyContent } from "@quizco/shared";
import {
  closestCorners,
  type CollisionDetection,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import {
  buildChronologyAnswer,
  createChronologyBoardStateFromAnswer,
  moveChronologyItem,
  type ChronologyDropTarget,
} from "./chronologyBoard";

interface ChronologyPlayerProps {
  content: ChronologyContent;
  value: ChronologyAnswer;
  onChange: (value: ChronologyAnswer) => void;
  /** When true, shows items in pool without interaction - used in QUESTION_PREVIEW */
  previewMode?: boolean;
  disabled?: boolean;
}

interface ChronologyItemView {
  id: string;
  text: string;
}

type ChronologyItemMap = Record<string, ChronologyItemView>;

interface ChronologyCardProps {
  id: string;
  text: string;
  isSelected: boolean;
  className?: string;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  onClick?: () => void;
}

const ChronologyCardShell: React.FC<ChronologyCardProps> = ({
  id,
  text,
  isSelected,
  className = "",
  dragProps,
  onClick,
}) => {
  return (
    <div
      data-testid={`chronology-item-${id}`}
      onClick={onClick}
      className={`flex h-16 cursor-grab items-center gap-3 rounded-2xl border-2 p-3 transition-all active:cursor-grabbing ${className} ${
        isSelected
          ? "border-blue-500 bg-blue-100 ring-4 ring-blue-300"
          : "border-blue-100 bg-white hover:border-blue-300"
      }`}
      {...dragProps}
    >
      <span className="flex-1 text-lg font-bold text-gray-800">{text}</span>
    </div>
  );
};

interface DraggableChronologyCardProps {
  id: string;
  text: string;
  isSelected: boolean;
  isSwapAnimating?: boolean;
  onSelect: () => void;
}

const DraggableChronologyCard: React.FC<DraggableChronologyCardProps> = ({
  id,
  text,
  isSelected,
  isSwapAnimating = false,
  onSelect,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    touchAction: "pan-y" as const,
  };
  const dragProps: React.HTMLAttributes<HTMLDivElement> = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ChronologyCardShell
        id={id}
        text={text}
        isSelected={isSelected}
        className={
          isDragging
            ? "pointer-events-none border-blue-500 bg-blue-50/70 opacity-0"
            : isSwapAnimating
              ? "scale-[1.02] border-blue-500 bg-blue-50"
              : ""
        }
        dragProps={dragProps}
        onClick={onSelect}
      />
    </div>
  );
};

interface PoolDropzoneProps {
  children: React.ReactNode;
  isOver: boolean;
  isSelectedTarget: boolean;
  dropRef: (element: HTMLElement | null) => void;
  onClick: () => void;
}

const PoolDropzone: React.FC<PoolDropzoneProps> = ({
  children,
  isOver,
  isSelectedTarget,
  dropRef,
  onClick,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-blue-700">
        {t("player.chronology_items_column")}
      </h3>
      <div
        ref={dropRef}
        onClick={onClick}
        data-testid="chronology-pool-dropzone"
        className={`min-h-48 rounded-2xl border-2 p-3 transition-colors cursor-pointer ${
          isSelectedTarget
            ? "border-green-500 bg-green-50 ring-4 ring-green-300"
            : isOver
              ? "border-blue-500 bg-blue-50"
              : "border-blue-200 bg-slate-50 hover:border-blue-300"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

interface PoolItemDropTargetProps {
  id: string;
  text: string;
  isSelected: boolean;
  isSwapAnimating: boolean;
  onSelect: () => void;
}

const POOL_DROPPABLE_ID = "chronology-pool";
const POOL_ITEM_DROPPABLE_PREFIX = "chronology-pool-item-";
const SLOT_DROPPABLE_PREFIX = "chronology-slot-";

const PoolItemDropTarget: React.FC<PoolItemDropTargetProps> = ({
  id,
  text,
  isSelected,
  isSwapAnimating,
  onSelect,
}) => {
  const dropId = `${POOL_ITEM_DROPPABLE_PREFIX}${id}`;
  const { setNodeRef } = useDroppable({ id: dropId });

  return (
    <div ref={setNodeRef} data-testid={dropId}>
      <DraggableChronologyCard
        id={id}
        text={text}
        isSelected={isSelected}
        isSwapAnimating={isSwapAnimating}
        onSelect={onSelect}
      />
    </div>
  );
};

interface SlotDropzoneProps {
  index: number;
  isOver: boolean;
  isSelectedTarget: boolean;
  children: React.ReactNode;
  onClick: () => void;
}

const SlotDropzone: React.FC<SlotDropzoneProps> = ({
  index,
  isOver,
  isSelectedTarget,
  children,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border-2 p-2 transition-colors cursor-pointer ${
        isSelectedTarget
          ? "border-green-500 bg-green-50 ring-4 ring-green-300"
          : isOver
            ? "border-blue-500 bg-blue-50"
            : "border-blue-200 bg-blue-50/40 hover:border-blue-300"
      } min-h-20`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-black text-white">
        {index + 1}
      </div>
      <div className="h-16 flex-1">{children}</div>
    </div>
  );
};

interface TimelineSlotProps {
  index: number;
  slotId: string | null;
  itemMap: ChronologyItemMap;
  overId: string | null;
  selectedId: string | null;
  swapFlashIds: string[];
  onCardSelect: (id: string) => void;
  onSlotClick: () => void;
}

const TimelineSlot: React.FC<TimelineSlotProps> = ({
  index,
  slotId,
  itemMap,
  overId,
  selectedId,
  swapFlashIds,
  onCardSelect,
  onSlotClick,
}) => {
  const { t } = useTranslation();
  const slotDroppableId = `${SLOT_DROPPABLE_PREFIX}${index}`;
  const { setNodeRef, isOver } = useDroppable({ id: slotDroppableId });
  const isOverSlot = isOver || overId === slotDroppableId;

  // Check if the slot is a valid target (empty or has a card that can be replaced)
  const isSelectedTarget =
    selectedId !== null && (slotId === null || slotId !== selectedId);

  return (
    <div ref={setNodeRef} data-testid={slotDroppableId}>
      <SlotDropzone
        index={index}
        isOver={isOverSlot}
        isSelectedTarget={isSelectedTarget}
        onClick={onSlotClick}
      >
        {slotId ? (
          <DraggableChronologyCard
            id={slotId}
            text={itemMap[slotId]?.text ?? ""}
            isSelected={selectedId === slotId}
            isSwapAnimating={swapFlashIds.includes(slotId)}
            onSelect={() => onCardSelect(slotId)}
          />
        ) : (
          <div className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-dashed border-blue-100 bg-white/70 px-3 text-center text-sm font-bold text-slate-500">
            ---
          </div>
        )}
      </SlotDropzone>
    </div>
  );
};

/**
 * Builds a stable id->item lookup table for rendering and drag overlay labels.
 */
const buildItemMap = (content: ChronologyContent): ChronologyItemMap => {
  return content.items.reduce<ChronologyItemMap>((acc, item) => {
    acc[item.id] = { id: item.id, text: item.text };
    return acc;
  }, {});
};

/**
 * Resolves dnd-kit over id to a semantic board target.
 * We support dropping over empty zones and over item cards themselves.
 */
const resolveDropTarget = (
  overId: string,
  slotIds: Array<string | null>,
  poolIds: string[],
): ChronologyDropTarget | null => {
  if (overId === POOL_DROPPABLE_ID) {
    return { type: "pool" };
  }

  if (overId.startsWith(SLOT_DROPPABLE_PREFIX)) {
    const index = Number(overId.slice(SLOT_DROPPABLE_PREFIX.length));
    if (!Number.isNaN(index)) {
      return { type: "slot", index, mode: "replace" };
    }
  }

  if (overId.startsWith(POOL_ITEM_DROPPABLE_PREFIX)) {
    const itemId = overId.slice(POOL_ITEM_DROPPABLE_PREFIX.length);
    const index = poolIds.indexOf(itemId);
    if (index !== -1) {
      return { type: "pool", index };
    }
    return { type: "pool" };
  }

  if (poolIds.includes(overId)) {
    return { type: "pool", index: poolIds.indexOf(overId) };
  }

  const slotIndex = slotIds.findIndex((id) => id === overId);
  if (slotIndex !== -1) {
    return { type: "slot", index: slotIndex };
  }

  return null;
};

export const ChronologyPlayer: React.FC<ChronologyPlayerProps> = ({
  content,
  value,
  onChange,
  previewMode = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const itemIds = useMemo(
    () => content.items.map((item) => item.id),
    [content.items],
  );
  const itemMap = useMemo(() => buildItemMap(content), [content]);

  const boardState = useMemo(
    () => createChronologyBoardStateFromAnswer(itemIds, value),
    [itemIds, value],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [swapFlashIds, setSwapFlashIds] = useState<string[]>([]);
  const swapFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poolDropElementRef = useRef<HTMLElement | null>(null);

  const { setNodeRef: setPoolNodeRef, isOver: isOverPool } = useDroppable({
    id: POOL_DROPPABLE_ID,
  });
  const setPoolDropRef = useCallback(
    (element: HTMLElement | null) => {
      poolDropElementRef.current = element;
      setPoolNodeRef(element);
    },
    [setPoolNodeRef],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    // Delay touch drag start so vertical swipes still scroll the page naturally.
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (disabled) {
        return;
      }
      setActiveId(String(event.active.id));
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (disabled) {
        return;
      }
      setOverId(event.over ? String(event.over.id) : null);
    },
    [disabled],
  );

  const resetDragState = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (swapFlashTimeoutRef.current) {
        clearTimeout(swapFlashTimeoutRef.current);
      }
    };
  }, []);

  const triggerSwapAnimation = useCallback((ids: string[]) => {
    if (swapFlashTimeoutRef.current) {
      clearTimeout(swapFlashTimeoutRef.current);
    }
    setSwapFlashIds(ids);
    swapFlashTimeoutRef.current = setTimeout(() => {
      setSwapFlashIds([]);
      swapFlashTimeoutRef.current = null;
    }, 240);
  }, []);

  // Move a card to a target (used by both drag and click)
  const moveCard = useCallback(
    (cardId: string, target: ChronologyDropTarget) => {
      const sourceSlotIndex = boardState.slotIds.findIndex((slotId) => slotId === cardId);
      const slotMode = target.type === "slot" ? (target.mode ?? "replace") : "replace";
      const displacedId =
        target.type === "slot" && slotMode === "replace"
          ? boardState.slotIds[target.index]
          : null;
      const isSwapAction =
        target.type === "slot" &&
        slotMode === "replace" &&
        sourceSlotIndex !== target.index &&
        displacedId !== null &&
        displacedId !== cardId;

      const nextState = moveChronologyItem(boardState, cardId, target);
      if (nextState !== boardState) {
        onChange(buildChronologyAnswer(nextState));
        if (isSwapAction && displacedId) {
          triggerSwapAnimation([cardId, displacedId]);
        }
      }
    },
    [boardState, onChange, triggerSwapAnimation],
  );

  // Handle card selection (click to select/deselect)
  const handleCardSelect = useCallback(
    (cardId: string) => {
      if (selectedId === cardId) {
        // Deselect if clicking the same card
        setSelectedId(null);
      } else {
        // Select the new card
        setSelectedId(cardId);
      }
    },
    [selectedId],
  );

  // Handle pool click (place selected card in pool)
  const handlePoolClick = useCallback(() => {
    if (selectedId !== null) {
      moveCard(selectedId, { type: "pool" });
      setSelectedId(null);
    }
  }, [selectedId, moveCard]);

  // Handle slot click (place selected card in slot)
  const handleSlotClick = useCallback(
    (index: number) => {
      if (selectedId !== null) {
        moveCard(selectedId, { type: "slot", index, mode: "replace" });
        setSelectedId(null);
      }
    },
    [selectedId, moveCard],
  );

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) {
      return pointerHits;
    }

    // Fallback keeps drag/drop usable if pointerWithin reports no target
    // (for example, around empty container edges during fast pointer moves).
    return closestCorners(args);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (disabled) {
        resetDragState();
        return;
      }

      const { active, over } = event;
      const sourceSlotIndex = boardState.slotIds.findIndex(
        (slotId) => slotId === String(active.id),
      );
      // dnd-kit can report over=null on pointer up; keep the last hover id as fallback.
      const resolvedOverId = over ? String(over.id) : overId;
      const translatedRect = active.rect.current.translated;
      const poolRect = poolDropElementRef.current?.getBoundingClientRect();
      const draggedCenterX = translatedRect
        ? translatedRect.left + translatedRect.width / 2
        : null;
      const draggedCenterY = translatedRect
        ? translatedRect.top + translatedRect.height / 2
        : null;
      const isReleasedOverPool =
        draggedCenterX !== null &&
        draggedCenterY !== null &&
        poolRect != null &&
        draggedCenterX >= poolRect.left &&
        draggedCenterX <= poolRect.right &&
        draggedCenterY >= poolRect.top &&
        draggedCenterY <= poolRect.bottom;

      if (
        !resolvedOverId &&
        !(
          boardState.poolIds.length === 0 &&
          sourceSlotIndex !== -1 &&
          isReleasedOverPool
        )
      ) {
        resetDragState();
        return;
      }

      const stableTarget =
        boardState.poolIds.length === 0 &&
        sourceSlotIndex !== -1 &&
        isReleasedOverPool
          ? ({ type: "pool" } as const)
          : resolveDropTarget(
              resolvedOverId!,
              boardState.slotIds,
              boardState.poolIds,
            );
      if (!stableTarget) {
        resetDragState();
        return;
      }

      moveCard(String(active.id), stableTarget);
      resetDragState();
    },
    [boardState, disabled, moveCard, overId, resetDragState],
  );

  const activeItem = activeId ? itemMap[activeId] : null;

  // Check if pool is a valid target - only when card is in a slot (can move back to pool)
  const isPoolSelectedTarget =
    selectedId !== null && boardState.slotIds.includes(selectedId);

  // Preview mode: show all items in pool with no interactions
  if (previewMode) {
    return (
      <div className="w-full space-y-3">
        <div className="grid grid-cols-2 gap-4">
          {/* Pool column - show all items here in preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-yellow-700">
              {t("player.chronology_items_column")}
            </h3>
            <div className="min-h-48 rounded-2xl border-2 border-yellow-500 bg-slate-50 p-3">
              <div className="space-y-2">
                {content.items.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`chronology-item-${item.id}`}
                    className="flex h-16 items-center gap-3 rounded-2xl border-2 border-blue-100 bg-white p-3"
                  >
                    <span className="flex-1 text-lg font-bold text-gray-800">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline column - show empty slots */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-yellow-700">
              {t("player.chronology_timeline_column")}
            </h3>
            <div className="space-y-2">
              {content.items.map((_, index) => (
                <div
                  key={index}
                  data-testid={`chronology-slot-${index}`}
                  className="flex min-h-20 items-center gap-3 rounded-2xl border-2 border-yellow-500 bg-blue-50/40 p-2"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-black text-white">
                    {index + 1}
                  </div>
                  <div className="h-16 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 text-center">
      <DndContext
        sensors={disabled ? [] : sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={resetDragState}
      >
        <div className="grid grid-cols-2 gap-4">
          <PoolDropzone
            isOver={isOverPool || overId === POOL_DROPPABLE_ID}
            isSelectedTarget={isPoolSelectedTarget}
            dropRef={setPoolDropRef}
            onClick={handlePoolClick}
          >
            <div className="space-y-2">
              {boardState.poolIds.map((id) => (
                <PoolItemDropTarget
                  key={id}
                  id={id}
                  text={itemMap[id]?.text ?? ""}
                  isSelected={selectedId === id}
                  isSwapAnimating={swapFlashIds.includes(id)}
                  onSelect={() => handleCardSelect(id)}
                />
              ))}
            </div>
          </PoolDropzone>

          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-blue-700">
              {t("player.chronology_timeline_column")}
            </h3>
            <div className="space-y-2">
              {boardState.slotIds.map((slotId, index) => (
                <TimelineSlot
                  key={`${SLOT_DROPPABLE_PREFIX}${index}`}
                  index={index}
                  slotId={slotId}
                  itemMap={itemMap}
                  overId={overId}
                  selectedId={selectedId}
                  swapFlashIds={swapFlashIds}
                  onCardSelect={handleCardSelect}
                  onSlotClick={() => handleSlotClick(index)}
                />
              ))}
            </div>
          </div>
        </div>

          <DragOverlay>
          {activeItem ? (
            <ChronologyCardShell
              id={activeItem.id}
              text={activeItem.text}
              isSelected={false}
              className="border-blue-500 bg-white shadow-2xl"
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

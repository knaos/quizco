import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { buildChronologyHandleLabels } from "./chronologyOrdering";
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
}

interface ChronologyItemView {
  id: string;
  text: string;
}

type ChronologyItemMap = Record<string, ChronologyItemView>;

interface ChronologyCardProps {
  id: string;
  text: string;
  handleLabel: string;
  className?: string;
  handleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

const ChronologyCardShell: React.FC<ChronologyCardProps> = ({
  id,
  text,
  handleLabel,
  className = "",
  handleProps,
}) => {
  const { t } = useTranslation();

  return (
    <div
      data-testid={`chronology-item-${id}`}
      className={`flex h-16 items-center gap-3 rounded-2xl border-2 p-3 transition-colors ${className}`}
    >
      <button
        type="button"
        className="flex h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 active:scale-95"
        data-testid={`chronology-handle-${id}`}
        aria-label={t("player.chronology_drag_handle", { label: handleLabel })}
        {...handleProps}
      >
        <span className="text-lg font-black leading-none">{handleLabel}</span>
        <GripVertical className="ml-1 h-4 w-4" />
      </button>
      <span className="flex-1 text-lg font-bold text-gray-800">{text}</span>
    </div>
  );
};

interface DraggableChronologyCardProps {
  id: string;
  text: string;
  handleLabel: string;
}

const DraggableChronologyCard: React.FC<DraggableChronologyCardProps> = ({
  id,
  text,
  handleLabel,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    touchAction: "pan-y" as const,
  };
  const handleProps: React.HTMLAttributes<HTMLButtonElement> = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ChronologyCardShell
        id={id}
        text={text}
        handleLabel={handleLabel}
        className={
          isDragging
            ? "pointer-events-none border-blue-500 bg-blue-50/70 opacity-0"
            : "border-blue-100 bg-white hover:border-blue-300"
        }
        handleProps={handleProps}
      />
    </div>
  );
};

interface PoolDropzoneProps {
  children: React.ReactNode;
  isOver: boolean;
  dropRef: (element: HTMLElement | null) => void;
}

const PoolDropzone: React.FC<PoolDropzoneProps> = ({ children, isOver, dropRef }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-blue-700">
        {t("player.chronology_items_column")}
      </h3>
      <div
        ref={dropRef}
        data-testid="chronology-pool-dropzone"
        className={`min-h-48 rounded-2xl border-2 p-3 transition-colors ${
          isOver
            ? "border-blue-500 bg-blue-50"
            : "border-blue-200 bg-slate-50"
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
  handleLabel: string;
}

const POOL_DROPPABLE_ID = "chronology-pool";
const POOL_ITEM_DROPPABLE_PREFIX = "chronology-pool-item-";
const SLOT_DROPPABLE_PREFIX = "chronology-slot-";

const PoolItemDropTarget: React.FC<PoolItemDropTargetProps> = ({
  id,
  text,
  handleLabel,
}) => {
  const dropId = `${POOL_ITEM_DROPPABLE_PREFIX}${id}`;
  const { setNodeRef } = useDroppable({ id: dropId });

  return (
    <div ref={setNodeRef} data-testid={dropId}>
      <DraggableChronologyCard id={id} text={text} handleLabel={handleLabel} />
    </div>
  );
};

interface SlotDropzoneProps {
  index: number;
  isOver: boolean;
  children: React.ReactNode;
}

const SlotDropzone: React.FC<SlotDropzoneProps> = ({ index, isOver, children }) => {
  const { t } = useTranslation();

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-2 transition-colors ${
        isOver
          ? "border-blue-500 bg-blue-50"
          : "border-blue-200 bg-blue-50/40"
      } min-h-28`}
    >
      <div className="px-2 pb-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
        {t("player.chronology_slot", { position: index + 1 })}
      </div>
      <div className="h-16">{children}</div>
    </div>
  );
};

interface TimelineSlotProps {
  index: number;
  slotId: string | null;
  itemMap: ChronologyItemMap;
  handleLabels: Record<string, string>;
  overId: string | null;
}

const TimelineSlot: React.FC<TimelineSlotProps> = ({
  index,
  slotId,
  itemMap,
  handleLabels,
  overId,
}) => {
  const { t } = useTranslation();
  const slotDroppableId = `${SLOT_DROPPABLE_PREFIX}${index}`;
  const { setNodeRef, isOver } = useDroppable({ id: slotDroppableId });
  const isOverSlot = isOver || overId === slotDroppableId;

  return (
    <div
      ref={setNodeRef}
      data-testid={slotDroppableId}
    >
      <SlotDropzone index={index} isOver={isOverSlot}>
        {slotId ? (
          <DraggableChronologyCard
            id={slotId}
            text={itemMap[slotId]?.text ?? ""}
            handleLabel={handleLabels[slotId] ?? "?"}
          />
        ) : (
          <div className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-dashed border-blue-100 bg-white/70 px-3 text-center text-sm font-bold text-slate-500">
            {t("player.chronology_drop_here")}
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
      return { type: "slot", index };
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
}) => {
  const { t } = useTranslation();
  const itemIds = useMemo(() => content.items.map((item) => item.id), [content.items]);
  const itemMap = useMemo(() => buildItemMap(content), [content]);
  const handleLabels = useMemo(
    () => buildChronologyHandleLabels(content.items),
    [content.items],
  );

  const boardState = useMemo(
    () => createChronologyBoardStateFromAnswer(itemIds, value),
    [itemIds, value],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  }, []);

  const resetDragState = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

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
        Boolean(poolRect) &&
        draggedCenterX >= poolRect.left &&
        draggedCenterX <= poolRect.right &&
        draggedCenterY >= poolRect.top &&
        draggedCenterY <= poolRect.bottom;

      if (!resolvedOverId && !(boardState.poolIds.length === 0 && sourceSlotIndex !== -1 && isReleasedOverPool)) {
        resetDragState();
        return;
      }

      const stableTarget =
        boardState.poolIds.length === 0 && sourceSlotIndex !== -1 && isReleasedOverPool
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

      const nextState = moveChronologyItem(
        boardState,
        String(active.id),
        stableTarget,
      );

      if (nextState !== boardState) {
        onChange(buildChronologyAnswer(nextState));
      }

      resetDragState();
    },
    [boardState, onChange, overId, resetDragState],
  );

  const activeItem = activeId ? itemMap[activeId] : null;

  return (
    <div className="w-full space-y-3">
      <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
        {t("player.chronology_instruction")}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={resetDragState}
      >
        <div className="grid grid-cols-2 gap-4">
          <PoolDropzone
            isOver={isOverPool || overId === POOL_DROPPABLE_ID}
            dropRef={setPoolDropRef}
          >
            <div className="space-y-2">
              {boardState.poolIds.map((id) => (
                <PoolItemDropTarget
                  key={id}
                  id={id}
                  text={itemMap[id]?.text ?? ""}
                  handleLabel={handleLabels[id] ?? "?"}
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
                  handleLabels={handleLabels}
                  overId={overId}
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
              handleLabel={handleLabels[activeItem.id] ?? "?"}
              className="border-blue-500 bg-white shadow-2xl"
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

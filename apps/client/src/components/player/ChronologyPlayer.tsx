import React, { useState, useCallback, useMemo } from "react";
import { GripVertical } from "lucide-react";
import type { ChronologyContent } from "@quizco/shared";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

// ... interfaces remain the same ...
interface ChronologyPlayerProps {
  content: ChronologyContent;
  onChange: (value: string[]) => void;
}

interface SortableItemProps {
  id: string;
  text: string;
}

const SortableItem = React.memo<SortableItemProps>(({ id, text }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    // FIX 1: Use Transform to support sortable animations correctly
    transform: CSS.Transform.toString(transform),
    // FIX 2: CRITICAL - Disable transition while dragging to remove input lag
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 10 : 0,
    // Optimization: Use touch-action: none to prevent browser scrolling while dragging
    touchAction: "none" 
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      // FIX 3: Removed scale-[1.05] to prevent layout jitter since we aren't using DragOverlay
      // If you want the scale effect, you must implement <DragOverlay />
      className={`flex items-center space-x-4 p-5 bg-white border-2 rounded-2xl transition-colors ${
        isDragging 
          ? "border-blue-500 shadow-2xl relative z-10" 
          : "border-gray-100 hover:border-gray-200"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        // focus:outline-none helps with keyboard nav visuals
        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 cursor-grab active:cursor-grabbing focus:outline-none"
      >
        <GripVertical className="w-6 h-6" />
      </div>

      <span className="flex-1 text-xl font-bold text-gray-800 select-none">
        {text}
      </span>
    </div>
  );
});

SortableItem.displayName = "SortableItem";

export const ChronologyPlayer: React.FC<ChronologyPlayerProps> = ({ content, onChange }) => {
  const [items, setItems] = useState(content.items || []);

  // FIX 4: Simplified Sensors (Removed TouchSensor, Pointer covers it)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Slight buffer prevents accidental drags on clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((i) => i.id === active.id);
        const newIndex = currentItems.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(currentItems, oldIndex, newIndex);
        
        // Defer the onChange callback to avoid blocking the render
        // Wrapping in requestAnimationFrame or setTimeout can make the drop feel snappier
        setTimeout(() => onChange(newItems.map(i => i.id)), 0);
        
        return newItems;
      });
    }
  }, [onChange]); // Removed 'items' dependency to prevent stale closures if using function update

  return (
    <div className="w-full space-y-4">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {items.map((item) => (
              <SortableItem key={item.id} id={item.id} text={item.text} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
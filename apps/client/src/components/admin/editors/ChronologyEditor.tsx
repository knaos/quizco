import React, { useCallback, useMemo } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { ChronologyContent, ChronologyItem } from "@quizco/shared";
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

interface ChronologyEditorProps {
  content: ChronologyContent;
  onChange: (content: ChronologyContent) => void;
}

interface SortableItemProps {
  id: string;
  text: string;
  onRemove: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
}

const SortableItem = React.memo<SortableItemProps>(({ id, text, onRemove, onTextChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-4 p-4 bg-white border-2 rounded-xl transition-all ${
        isDragging ? "border-blue-500 shadow-xl scale-[1.02] relative" : "border-gray-100"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded-lg text-gray-400"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <input
        type="text"
        value={text}
        onChange={(e) => onTextChange(id, e.target.value)}
        className="flex-1 p-3 rounded-lg border border-gray-100 focus:border-blue-500 outline-none transition"
        placeholder="Enter event or item..."
      />

      <button
        onClick={() => onRemove(id)}
        className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
});

SortableItem.displayName = "SortableItem";

export const ChronologyEditor: React.FC<ChronologyEditorProps> = ({ content, onChange }) => {
  const items = content.items || [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index,
      }));

      onChange({ ...content, items: newItems });
    }
  }, [items, content, onChange]);

  const addItem = useCallback(() => {
    const newItem: ChronologyItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: "",
      order: items.length,
    };
    onChange({ ...content, items: [...items, newItem] });
  }, [items, content, onChange]);

  const removeItem = useCallback((id: string) => {
    const newItems = items
      .filter((i) => i.id !== id)
      .map((item, index) => ({
        ...item,
        order: index,
      }));
    onChange({ ...content, items: newItems });
  }, [items, content, onChange]);

  const updateItemText = useCallback((id: string, text: string) => {
    const newItems = items.map((i) => (i.id === id ? { ...i, text } : i));
    onChange({ ...content, items: newItems });
  }, [items, content, onChange]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-gray-500 italic">
          Arrange items in the CORRECT chronological order.
        </p>
        <button
          onClick={addItem}
          className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Item
        </button>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((item) => (
              <SortableItem
                key={item.id}
                id={item.id}
                text={item.text}
                onRemove={removeItem}
                onTextChange={updateItemText}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <div className="text-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-medium">No items added yet. Click "Add Item" to begin.</p>
        </div>
      )}
    </div>
  );
};

import type { ChronologyItem } from "@quizco/shared";

export const toAlphabetLabel = (index: number): string => {
  if (index < 0) {
    return "A";
  }

  let value = index;
  let label = "";

  while (value >= 0) {
    label = String.fromCharCode((value % 26) + 65) + label;
    value = Math.floor(value / 26) - 1;
  }

  return label;
};

export const buildChronologyHandleLabels = (
  items: Pick<ChronologyItem, "id">[],
): Record<string, string> => {
  return items.reduce<Record<string, string>>((acc, item, index) => {
    acc[item.id] = toAlphabetLabel(index);
    return acc;
  }, {});
};

export const reorderChronologyItems = (
  items: ChronologyItem[],
  activeId: string,
  overId: string,
): ChronologyItem[] => {
  const sourceIndex = items.findIndex((item) => item.id === activeId);
  const targetIndex = items.findIndex((item) => item.id === overId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, moved);

  return nextItems;
};

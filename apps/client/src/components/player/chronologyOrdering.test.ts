import { describe, expect, it } from "vitest";
import type { ChronologyItem } from "@quizco/shared";
import {
  buildChronologyHandleLabels,
  reorderChronologyItems,
  toAlphabetLabel,
} from "./chronologyOrdering";

describe("chronologyOrdering", () => {
  it("maps indexes to alphabet labels including overflow", () => {
    expect(toAlphabetLabel(0)).toBe("A");
    expect(toAlphabetLabel(25)).toBe("Z");
    expect(toAlphabetLabel(26)).toBe("AA");
    expect(toAlphabetLabel(27)).toBe("AB");
  });

  it("builds stable handle labels from item order", () => {
    const labels = buildChronologyHandleLabels([
      { id: "event-3" },
      { id: "event-1" },
      { id: "event-2" },
    ]);

    expect(labels).toEqual({
      "event-3": "A",
      "event-1": "B",
      "event-2": "C",
    });
  });

  it("reorders items from dragged id to target slot id", () => {
    const items: ChronologyItem[] = [
      { id: "a", text: "A", order: 0 },
      { id: "b", text: "B", order: 1 },
      { id: "c", text: "C", order: 2 },
    ];

    const next = reorderChronologyItems(items, "c", "a");
    expect(next.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("keeps order unchanged when ids are invalid", () => {
    const items: ChronologyItem[] = [
      { id: "a", text: "A", order: 0 },
      { id: "b", text: "B", order: 1 },
    ];

    expect(reorderChronologyItems(items, "missing", "a")).toBe(items);
    expect(reorderChronologyItems(items, "a", "missing")).toBe(items);
    expect(reorderChronologyItems(items, "a", "a")).toBe(items);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildChronologyAnswer,
  buildChronologyOrderForGrading,
  createChronologyBoardStateFromAnswer,
  createInitialChronologyBoardState,
  moveChronologyItem,
} from "./chronologyBoard";

describe("chronologyBoard", () => {
  it("creates initial state with all items in pool and empty placeholders", () => {
    const state = createInitialChronologyBoardState(["a", "b", "c"]);
    expect(state).toEqual({
      poolIds: ["a", "b", "c"],
      slotIds: [null, null, null],
    });
  });

  it("hydrates board from chronology answer payload", () => {
    const state = createChronologyBoardStateFromAnswer(
      ["a", "b", "c", "d"],
      {
        slotIds: ["c", "a", null, null],
        poolIds: ["d", "b"],
      },
    );

    expect(state).toEqual({
      slotIds: ["c", "a", null, null],
      poolIds: ["d", "b"],
    });
  });

  it("normalizes invalid chronology answer ids", () => {
    const state = createChronologyBoardStateFromAnswer(
      ["a", "b", "c"],
      {
        slotIds: ["z", "a"],
        poolIds: ["b", "z"],
      },
    );

    expect(state).toEqual({
      slotIds: [null, "a", null],
      poolIds: ["b", "c"],
    });
  });

  it("moves item from pool to empty slot", () => {
    const initial = createInitialChronologyBoardState(["a", "b"]);
    const next = moveChronologyItem(initial, "b", { type: "slot", index: 0 });
    expect(next).toEqual({
      poolIds: ["a"],
      slotIds: ["b", null],
    });
  });

  it("moves item from pool to occupied slot and returns displaced item to pool", () => {
    const initial = {
      poolIds: ["a", "b"],
      slotIds: ["c", null],
    };

    const next = moveChronologyItem(initial, "a", { type: "slot", index: 0 });
    expect(next).toEqual({
      poolIds: ["b", "c"],
      slotIds: ["a", null],
    });
  });

  it("moves item between slots and keeps swap behavior", () => {
    const initial = {
      poolIds: [],
      slotIds: ["a", "b", null],
    };

    const next = moveChronologyItem(initial, "a", { type: "slot", index: 1 });
    expect(next).toEqual({
      poolIds: [],
      slotIds: ["b", "a", null],
    });
  });

  it("moves slotted item back to pool", () => {
    const initial = {
      poolIds: ["c"],
      slotIds: ["a", "b", null],
    };

    const next = moveChronologyItem(initial, "a", { type: "pool" });
    expect(next).toEqual({
      poolIds: ["c", "a"],
      slotIds: [null, "b", null],
    });
  });

  it("inserts slotted item into pool at requested index", () => {
    const initial = {
      poolIds: ["c", "d"],
      slotIds: ["a", "b", null],
    };

    const next = moveChronologyItem(initial, "a", { type: "pool", index: 1 });
    expect(next).toEqual({
      poolIds: ["c", "a", "d"],
      slotIds: [null, "b", null],
    });
  });

  it("reorders items within pool using pool target index", () => {
    const initial = {
      poolIds: ["a", "b", "c"],
      slotIds: [null, null, null],
    };

    const next = moveChronologyItem(initial, "c", { type: "pool", index: 1 });
    expect(next).toEqual({
      poolIds: ["a", "c", "b"],
      slotIds: [null, null, null],
    });
  });

  it("returns same state for invalid moves", () => {
    const initial = createInitialChronologyBoardState(["a", "b"]);

    expect(moveChronologyItem(initial, "missing", { type: "slot", index: 0 })).toBe(initial);
    expect(moveChronologyItem(initial, "a", { type: "slot", index: 10 })).toBe(initial);
    expect(moveChronologyItem(initial, "a", { type: "pool" })).toBe(initial);
  });

  it("builds chronology answer payload from board state", () => {
    const payload = buildChronologyAnswer({
      poolIds: ["d", "e"],
      slotIds: ["b", null, "a", "c"],
    });

    expect(payload).toEqual({
      poolIds: ["d", "e"],
      slotIds: ["b", null, "a", "c"],
    });
  });

  it("builds grading order from chronology answer payload (placed items only)", () => {
    const order = buildChronologyOrderForGrading({
      poolIds: ["d", "e"],
      slotIds: ["b", null, "a", "c"],
    });

    expect(order).toEqual(["b", "a", "c"]);
  });

  it("returns only placed items when some slots are empty", () => {
    const order = buildChronologyOrderForGrading({
      poolIds: ["c", "d"],
      slotIds: ["a", null, "b"],
    });

    expect(order).toEqual(["a", "b"]);
  });
});

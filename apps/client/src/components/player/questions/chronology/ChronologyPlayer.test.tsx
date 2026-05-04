import { describe, expect, it, vi } from "vitest";
import type { ChronologyAnswer, ChronologyContent } from "@quizco/shared";
import { click, render } from "../../../../test/render";
import { ChronologyPlayer } from "./ChronologyPlayer";

const content: ChronologyContent = {
  items: [
    { id: "event-1", text: "Creation", order: 0 },
    { id: "event-2", text: "Exodus", order: 1 },
  ],
};

const value: ChronologyAnswer = {
  slotIds: [null, null],
  poolIds: ["event-1", "event-2"],
};

describe("ChronologyPlayer", () => {
  it("disables drag affordances while click-to-reorder selection is active", () => {
    const onChange = vi.fn();
    const view = render(
      <ChronologyPlayer content={content} value={value} onChange={onChange} />,
    );

    const firstCard = view.container.querySelector(
      '[data-testid="chronology-item-event-1"]',
    ) as HTMLElement | null;
    const secondCard = view.container.querySelector(
      '[data-testid="chronology-item-event-2"]',
    ) as HTMLElement | null;

    expect(firstCard?.className).toContain("cursor-grab");
    expect(secondCard?.className).toContain("cursor-grab");

    click(firstCard as HTMLElement);

    const selectedFirstCard = view.container.querySelector(
      '[data-testid="chronology-item-event-1"]',
    ) as HTMLElement | null;
    const selectedSecondCard = view.container.querySelector(
      '[data-testid="chronology-item-event-2"]',
    ) as HTMLElement | null;

    expect(selectedFirstCard?.className).toContain("cursor-pointer");
    expect(selectedFirstCard?.className).not.toContain("cursor-grab");
    expect(selectedSecondCard?.className).toContain("cursor-pointer");
    expect(selectedSecondCard?.className).not.toContain("cursor-grab");

    const firstSlotWrapper = view.container.querySelector(
      '[data-testid="chronology-slot-0"]',
    ) as HTMLElement | null;
    const firstSlot = firstSlotWrapper?.firstElementChild as HTMLElement | null;

    click(firstSlot as HTMLElement);

    expect(onChange).toHaveBeenCalledWith({
      slotIds: ["event-1", null],
      poolIds: ["event-2"],
    });

    view.unmount();
  });
});

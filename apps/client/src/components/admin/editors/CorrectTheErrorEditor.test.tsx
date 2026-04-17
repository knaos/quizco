import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { click, render } from "../../../test/render";
import CorrectTheErrorEditor from "./CorrectTheErrorEditor";

function changeValue(element: HTMLElement, value: string) {
  act(() => {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const prototype =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : input instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("CorrectTheErrorEditor", () => {
  it("binds alternatives to the selected sentence token instead of the next sequential index", () => {
    const onChange = vi.fn();
    const view = render(
      <CorrectTheErrorEditor
        content={{
          text: "",
          words: [],
          errorWordIndex: -1,
          correctReplacement: "",
        }}
        onChange={onChange}
      />,
    );

    const textArea = view.container.querySelector("textarea");
    expect(textArea).not.toBeNull();
    changeValue(textArea as HTMLElement, "The sky is very green today");

    const addWordButton = view.container.querySelector(
      '[data-testid="cte-editor-add-word"]',
    );
    expect(addWordButton).not.toBeNull();
    click(addWordButton as HTMLElement);

    const targetSelect = view.container.querySelector(
      '[data-testid="cte-editor-word-target-0"]',
    );
    expect(targetSelect).not.toBeNull();
    changeValue(targetSelect as HTMLElement, "4");

    const latestPayload = onChange.mock.calls.at(-1)?.[0];
    expect(latestPayload.words).toEqual([
      {
        wordIndex: 4,
        text: "green",
        alternatives: ["", "", ""],
      },
    ]);

    view.unmount();
  });
});

import { act } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";

interface RenderResult {
  container: HTMLDivElement;
  rerender: (ui: ReactElement) => void;
  unmount: () => void;
}

export function render(ui: ReactElement): RenderResult {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    container,
    rerender(nextUi: ReactElement) {
      act(() => {
        root.render(nextUi);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

export async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

export function click(element: HTMLElement): void {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

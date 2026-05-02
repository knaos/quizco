import type { ReactElement } from "react";
import { act, useEffect } from "react";
import { render } from "../test/render";

interface RenderHookOptions {
  wrapper?: (props: { children: ReactElement }) => ReactElement;
}

export function renderHook<T>(useHook: () => T, options?: RenderHookOptions) {
  const resultRef: { current: T | undefined } = { current: undefined };

  function Harness(): ReactElement | null {
    const result = useHook();

    useEffect(() => {
      resultRef.current = result;
    }, [result]);

    return null;
  }

  const hookUi = <Harness />;
  const buildHookUi = () =>
    options?.wrapper ? options.wrapper({ children: hookUi }) : hookUi;
  const view = render(buildHookUi());

  return {
    ...view,
    rerender() {
      view.rerender(buildHookUi());
    },
    get result(): T {
      return resultRef.current!;
    },
    act,
  };
}

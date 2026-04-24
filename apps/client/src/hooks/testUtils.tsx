import type { ReactElement } from "react";
import { act, useEffect } from "react";
import { render } from "../test/render";

interface RenderHookOptions {
  wrapper?: (props: { children: ReactElement }) => ReactElement;
}

export function renderHook<T>(useHook: () => T, options?: RenderHookOptions) {
  const resultRef: { current: T | undefined } = { current: undefined };
  const renderHarness = () =>
    options?.wrapper ? options.wrapper({ children: <Harness /> }) : <Harness />;

  function Harness(): ReactElement | null {
    const result = useHook();

    useEffect(() => {
      resultRef.current = result;
    }, [result]);

    return null;
  }

  const view = render(renderHarness());

  return {
    ...view,
    rerenderHook() {
      view.rerender(renderHarness());
    },
    get result(): T {
      return resultRef.current!;
    },
    act,
  };
}

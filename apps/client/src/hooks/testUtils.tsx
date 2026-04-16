import type { ReactElement } from "react";
import { act, useEffect } from "react";
import { render } from "../test/render";

export function renderHook<T>(useHook: () => T) {
  const resultRef: { current: T | undefined } = { current: undefined };

  function Harness(): ReactElement | null {
    const result = useHook();

    useEffect(() => {
      resultRef.current = result;
    }, [result]);

    return null;
  }

  const view = render(<Harness />);

  return {
    ...view,
    get result(): T {
      return resultRef.current!;
    },
    act,
  };
}

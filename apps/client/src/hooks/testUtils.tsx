import type { ReactElement } from "react";
import { act } from "react";
import { render } from "../test/render";

export function renderHook<T>(useHook: () => T) {
  let result: T;

  function Harness(): ReactElement | null {
    result = useHook();
    return null;
  }

  const view = render(<Harness />);

  return {
    ...view,
    get result(): T {
      return result!;
    },
    act,
  };
}

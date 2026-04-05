import { useLayoutEffect, useRef } from "react";

/**
 * A hook that takes a value and returns a stable reference to it.
 * Useful for preventing unnecessary effect re-runs when the value changes.
 *
 * @param value - The value to create a stable reference for
 * @returns A stable reference to the value
 */
export function useStableRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef<T>(value);

  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}

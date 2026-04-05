import { useCallback, useRef } from "react";

export function useMutationHighlightDebouncer(delayMs: number): {
  schedule: (callback: () => void) => void;
  cancel: () => void;
} {
  const timeoutIdRef = useRef<number | null>(null);
  const schedule = useCallback(
    (callback: () => void): void => {
      if (timeoutIdRef.current != null) {
        return;
      }
      timeoutIdRef.current = window.setTimeout(() => {
        timeoutIdRef.current = null;
        callback();
      }, delayMs);
    },
    [delayMs],
  );
  const cancel = useCallback((): void => {
    if (timeoutIdRef.current != null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  return { schedule, cancel };
}

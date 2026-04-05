import { useCallback, useSyncExternalStore } from "react";

export function useElementInView({
  container,
  target,
}: {
  container: HTMLDivElement | null;
  target: HTMLDivElement | null;
}): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (!container || !target) {
        return () => {};
      }
      const handleChange = (): void => {
        onStoreChange();
      };
      container.addEventListener("scroll", handleChange, { passive: true });
      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(handleChange);
      if (resizeObserver) {
        resizeObserver.observe(container);
        resizeObserver.observe(target);
      }
      return (): void => {
        container.removeEventListener("scroll", handleChange);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    },
    [container, target],
  );

  const getSnapshot = useCallback((): boolean => {
    if (!container || !target) {
      return true;
    }
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    return (
      targetRect.bottom > containerRect.top &&
      targetRect.top < containerRect.bottom
    );
  }, [container, target]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

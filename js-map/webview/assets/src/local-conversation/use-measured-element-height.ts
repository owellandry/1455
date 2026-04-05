import type { RefObject } from "react";
import { useEffectEvent, useLayoutEffect, useRef, useState } from "react";

export function useMeasuredElementHeight<T extends HTMLElement>(): {
  elementHeightPx: number;
  elementRef: RefObject<T | null>;
} {
  const elementRef = useRef<T | null>(null);
  const observedElementRef = useRef<T | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [elementHeightPx, setElementHeightPx] = useState(0);

  const updateHeight = useEffectEvent((): void => {
    const element = elementRef.current;
    if (element == null) {
      return;
    }
    const measuredHeight = element.scrollHeight;
    setElementHeightPx((previousHeight): number => {
      if (previousHeight === measuredHeight) {
        return previousHeight;
      }
      return measuredHeight;
    });
  });

  useLayoutEffect(() => {
    updateHeight();
    const element = elementRef.current;

    if (observedElementRef.current === element) {
      return;
    }

    if (
      resizeObserverRef.current == null &&
      typeof ResizeObserver !== "undefined"
    ) {
      resizeObserverRef.current = new ResizeObserver((): void => {
        updateHeight();
      });
    }

    if (observedElementRef.current != null) {
      resizeObserverRef.current?.unobserve(observedElementRef.current);
    }

    if (element != null) {
      resizeObserverRef.current?.observe(element);
    }

    observedElementRef.current = element;
  });

  useLayoutEffect(() => {
    return (): void => {
      if (observedElementRef.current != null) {
        resizeObserverRef.current?.unobserve(observedElementRef.current);
      }
      resizeObserverRef.current?.disconnect();
      observedElementRef.current = null;
      resizeObserverRef.current = null;
    };
  }, []);

  return {
    elementHeightPx,
    elementRef,
  };
}

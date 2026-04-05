// Adapted from chatgpt/web
import { useCallback, useEffectEvent, useLayoutEffect, useState } from "react";

type Handler<T extends HTMLElement> = (
  entry: ResizeObserverEntry,
  element: T,
) => void;
type RefCallback<T> = (instance: null | T) => void;

/**
 * Convenience hook for using ResizeObserver. NOTE: There are
 * several cloned copies of this hook, but they are in other
 * projects and thus not accessible within the ChatGPT web app.
 *
 * @param handler
 * @returns
 */
export function useResizeObserver<T extends HTMLElement>(
  handler: Handler<T>,
): RefCallback<T> {
  const handlerRef = useEffectEvent(handler);

  const [element, setElement] = useState<null | T>(null);

  // stable function for capturing ref on element
  const elementRef = useCallback((value: null | T) => {
    setElement(value);
  }, []);

  useLayoutEffect(() => {
    if (element == null) {
      return;
    }

    const observer = new ResizeObserver((entryList) => {
      for (const entry of entryList) {
        handlerRef(entry, element);
      }
    });

    // Start observing an element
    observer.observe(element);

    return (): void => {
      observer.disconnect();
    };
  }, [element]);

  return elementRef;
}

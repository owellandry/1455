import {
  useCallback,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from "react";

const ACTIVE_SECTION_OFFSET = 96;

export function useSectionNav({
  container,
  sectionIds,
}: {
  container: HTMLDivElement | null;
  sectionIds: Array<string>;
}): {
  activeSectionId: string | null;
  scrollToSection: (sectionId: string) => void;
  setSectionElement: (sectionId: string, node: HTMLElement | null) => void;
} {
  const sectionElementsRef = useRef<Record<string, HTMLElement | null>>({});
  const activeSectionId = useActiveSectionId({
    container,
    sectionElementsRef,
    sectionIds,
  });
  const setSectionElement = useCallback(
    (sectionId: string, node: HTMLElement | null): void => {
      if (node == null) {
        delete sectionElementsRef.current[sectionId];
        return;
      }

      sectionElementsRef.current[sectionId] = node;
    },
    [],
  );
  const scrollToSection = useCallback((sectionId: string): void => {
    sectionElementsRef.current[sectionId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  return {
    activeSectionId,
    scrollToSection,
    setSectionElement,
  };
}

function useActiveSectionId({
  container,
  sectionElementsRef,
  sectionIds,
}: {
  container: HTMLDivElement | null;
  sectionElementsRef: RefObject<Record<string, HTMLElement | null>>;
  sectionIds: Array<string>;
}): string | null {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (container == null) {
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
      if (resizeObserver != null) {
        resizeObserver.observe(container);
        for (const sectionId of sectionIds) {
          const element = sectionElementsRef.current[sectionId];
          if (element != null) {
            resizeObserver.observe(element);
          }
        }
      }

      return (): void => {
        container.removeEventListener("scroll", handleChange);
        resizeObserver?.disconnect();
      };
    },
    [container, sectionElementsRef, sectionIds],
  );

  const getSnapshot = useCallback((): string | null => {
    if (sectionIds.length === 0) {
      return null;
    }

    if (container == null) {
      return sectionIds[0];
    }

    const containerRect = container.getBoundingClientRect();
    const threshold = containerRect.top + ACTIVE_SECTION_OFFSET;
    let nextActiveSectionId = sectionIds[0];

    for (const sectionId of sectionIds) {
      const element = sectionElementsRef.current[sectionId];
      if (element == null) {
        continue;
      }

      if (element.getBoundingClientRect().top <= threshold) {
        nextActiveSectionId = sectionId;
      } else {
        break;
      }
    }

    return nextActiveSectionId;
  }, [container, sectionElementsRef, sectionIds]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

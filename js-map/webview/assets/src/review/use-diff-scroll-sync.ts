import type React from "react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export function useDiffScrollSync({
  fileEntries,
  scrollSyncEnabled,
}: {
  fileEntries: Array<{ path: string }>;
  scrollSyncEnabled: boolean;
}): {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  diffRefs: React.RefObject<Map<string, HTMLDivElement | null>>;
  selectedFilePath: string | undefined;
  activeFilePath: string | undefined;
  selectFile: (path: string) => void;
  setSelectedPathWithoutScroll: (path: string) => void;
} {
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>(
    () => fileEntries[0]?.path,
  );

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const diffRefs = useRef<Map<string, HTMLDivElement | null>>(
    new Map<string, HTMLDivElement | null>(),
  );
  const scrollSyncTimeoutRef = useRef<number | null>(null);
  const pendingSelectedPathRef = useRef<string | undefined>(undefined);
  const fileEntriesRef = useRef(fileEntries);
  useLayoutEffect(() => {
    fileEntriesRef.current = fileEntries;
  }, [fileEntries]);
  let activeFilePath: string | undefined;
  if (fileEntries.length > 0) {
    activeFilePath = selectedFilePath;
    if (
      activeFilePath == null ||
      !fileEntries.some((entry) => entry.path === activeFilePath)
    ) {
      activeFilePath = fileEntries[0].path;
    }
  }

  const getBestPathForScroll = useEffectEvent((): string | undefined => {
    const container = scrollContainerRef.current;
    if (!container || fileEntries.length === 0) {
      return undefined;
    }

    const containerRect = container.getBoundingClientRect();
    const firstEntry = fileEntries[0];
    const lastEntry = fileEntries[fileEntries.length - 1];
    const firstTarget = firstEntry
      ? diffRefs.current.get(firstEntry.path)
      : undefined;
    const lastTarget = lastEntry
      ? diffRefs.current.get(lastEntry.path)
      : undefined;

    const isFullyVisible = (rect: DOMRect): boolean => {
      const fitsTop = rect.top >= containerRect.top;
      const fitsBottom = rect.bottom <= containerRect.bottom;

      return fitsTop && fitsBottom;
    };

    if (firstEntry && firstTarget) {
      const firstRect = firstTarget.getBoundingClientRect();
      if (isFullyVisible(firstRect)) {
        return firstEntry.path;
      }
    }

    if (lastEntry && lastTarget) {
      const lastRect = lastTarget.getBoundingClientRect();
      if (isFullyVisible(lastRect)) {
        return lastEntry.path;
      }
    }

    let bestPath: string | undefined;
    let bestVisibleRatio = -1;
    let bestVisibleHeight = 0;

    for (const entry of fileEntries) {
      const target = diffRefs.current.get(entry.path);
      if (!target) {
        continue;
      }

      const targetRect = target.getBoundingClientRect();
      const visibleTop = Math.max(targetRect.top, containerRect.top);
      const visibleBottom = Math.min(targetRect.bottom, containerRect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      if (visibleHeight === 0) {
        continue;
      }

      const totalHeight = Math.max(1, targetRect.height);
      const visibleRatio = visibleHeight / totalHeight;

      const isBetterCandidate =
        visibleRatio > bestVisibleRatio ||
        (visibleRatio === bestVisibleRatio &&
          visibleHeight > bestVisibleHeight);

      if (isBetterCandidate) {
        bestPath = entry.path;
        bestVisibleRatio = visibleRatio;
        bestVisibleHeight = visibleHeight;
      }
    }

    if (!bestPath) {
      return undefined;
    }

    return bestPath;
  });

  const commitPendingPath = useEffectEvent((): void => {
    const nextPath = pendingSelectedPathRef.current ?? getBestPathForScroll();
    if (!nextPath) {
      return;
    }
    if (selectedFilePath !== nextPath) {
      setSelectedFilePath(nextPath);
    }
  });

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = (): void => {
      if (scrollSyncTimeoutRef.current != null) {
        window.clearTimeout(scrollSyncTimeoutRef.current);
      }

      pendingSelectedPathRef.current = undefined;
      scrollSyncTimeoutRef.current = window.setTimeout((): void => {
        scrollSyncTimeoutRef.current = null;
        if (!scrollSyncEnabled) {
          return;
        }
        commitPendingPath();
      }, 160);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return (): void => {
      if (scrollSyncTimeoutRef.current != null) {
        window.clearTimeout(scrollSyncTimeoutRef.current);
        scrollSyncTimeoutRef.current = null;
      }

      container.removeEventListener("scroll", handleScroll);
    };
  }, [fileEntries, scrollSyncEnabled]);

  useEffect(() => {
    if (!scrollSyncEnabled) {
      return;
    }
    pendingSelectedPathRef.current = getBestPathForScroll();
    commitPendingPath();
  }, [fileEntries, scrollSyncEnabled]);

  const setSelectedPathWithoutScroll = useCallback((path: string): void => {
    if (!fileEntriesRef.current.some((entry) => entry.path === path)) {
      return;
    }
    setSelectedFilePath(path);
  }, []);

  const selectFile = useCallback(
    (path: string): void => {
      if (!fileEntries.some((entry) => entry.path === path)) {
        return;
      }

      setSelectedFilePath(path);
      const target = diffRefs.current.get(path);
      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    },
    [fileEntries],
  );

  return {
    scrollContainerRef,
    diffRefs,
    selectedFilePath,
    activeFilePath,
    selectFile,
    setSelectedPathWithoutScroll,
  };
}

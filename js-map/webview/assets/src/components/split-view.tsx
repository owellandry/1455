import clsx from "clsx";
import type {
  ReactElement,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  Activity,
  createContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { getPersistedAtomStorage } from "@/utils/persisted-atom-store";

type SplitSide = "left" | "right";
type SplitViewHmrStoreData = {
  splitViewHmrStore?: { version: number; listeners: Set<() => void> };
};

type SplitViewContextValue = {
  isLeftOpen: boolean;
  isRightOpen: boolean;
  isResizing: boolean;
  collapse: (side: SplitSide) => void;
  expand: (side: SplitSide) => void;
  toggle: (side: SplitSide) => void;
};

const DEFAULT_HANDLE_WIDTH = 12;
const DEFAULT_MIN_PANEL_WIDTH = 160;
const DEFAULT_LEFT_RATIO = 0.5;
const DRAWER_BREAKPOINT = 720;
const DRAWER_WIDTH_RATIO = 0.9;
const RIGHT_CONTENT_FADE_DELAY_MS = 150;

const splitViewHmrStore = ((): {
  version: number;
  listeners: Set<() => void>;
} => {
  if (!import.meta.hot) {
    return { version: 0, listeners: new Set<() => void>() };
  }
  const hotData = import.meta.hot.data as SplitViewHmrStoreData | undefined;
  const existingStore = hotData?.splitViewHmrStore;
  const store = existingStore ?? {
    version: 0,
    listeners: new Set<() => void>(),
  };
  store.version += 1;
  if (hotData != null) {
    hotData.splitViewHmrStore = store;
  }
  queueMicrotask(() => {
    for (const listener of store.listeners) {
      listener();
    }
  });
  import.meta.hot.dispose(() => {
    if (hotData != null) {
      hotData.splitViewHmrStore = store;
    }
  });
  return store;
})();

const SplitViewContext = createContext<SplitViewContextValue | null>(null);

export function SplitView({
  id,
  left,
  right,
  className,
  leftClassName,
  rightClassName,
  handleClassName,
  defaultLeftPercent,
  minLeftWidth = DEFAULT_MIN_PANEL_WIDTH,
  minRightWidth = DEFAULT_MIN_PANEL_WIDTH,
  handleWidth = DEFAULT_HANDLE_WIDTH,
  drawerBreakpoint = DRAWER_BREAKPOINT,
  isLeftOpen = true,
  isRightOpen = true,
  onLeftOpenChange,
  onRightOpenChange,
}: {
  id: string;
  left: ReactNode;
  right: ReactNode | null;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
  handleClassName?: string;
  defaultLeftPercent?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  handleWidth?: number;
  drawerBreakpoint?: number;
  isLeftOpen?: boolean;
  isRightOpen?: boolean;
  onLeftOpenChange?: (isOpen: boolean) => void;
  onRightOpenChange?: (isOpen: boolean) => void;
}): ReactElement {
  const hmrVersion = useSplitViewHmrVersion();
  const hasRightPanel = right != null;
  const effectiveIsRightOpen = hasRightPanel ? isRightOpen : false;
  const effectiveIsLeftOpen = hasRightPanel ? isLeftOpen : true;
  const storage = getPersistedAtomStorage<number>();
  const storageKey = `${id}:split-left-width`;
  const persistedLeftValue = storage.getItem(storageKey, Number.NaN);
  const hasPersistedRatio =
    Number.isFinite(persistedLeftValue) && persistedLeftValue <= 1;
  const defaultLeftRatio = getDefaultLeftRatio(defaultLeftPercent);
  const initialLeftRatio = hasPersistedRatio
    ? clampRatio(persistedLeftValue)
    : defaultLeftRatio;
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);
  const containerLeftRef = useRef<number | null>(null);
  const hasHydratedRef = useRef<boolean>(false);
  const prevContainerWidthRef = useRef<number | null>(null);
  const prevLeftOpenRef = useRef<boolean | null>(null);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const leftOpenRatioRef = useRef<number>(initialLeftRatio);
  const rightWidthRef = useRef<number>(0);
  const lastPersistedLeftValueRef = useRef<number | null>(
    hasPersistedRatio ? clampRatio(persistedLeftValue) : null,
  );
  const forceNonDrawerForFullReview =
    hasRightPanel && !effectiveIsLeftOpen && effectiveIsRightOpen;
  const isDrawerMode =
    drawerBreakpoint > 0 &&
    hasRightPanel &&
    containerWidth > 0 &&
    containerWidth <= drawerBreakpoint &&
    !forceNonDrawerForFullReview;
  const effectiveHandleWidth = isDrawerMode ? 0 : handleWidth;

  useLayoutEffect((): void => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const nextWidth = node.getBoundingClientRect().width;
    setContainerWidth(nextWidth);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(nextWidth);
    });
    observer.observe(node);
    return (): void => {
      observer.disconnect();
    };
  }, []);

  useEffect((): void => {
    if (!containerWidth || !hasRightPanel) {
      return;
    }
    if (!isLeftOpen && !isRightOpen) {
      onLeftOpenChange?.(true);
    }
  }, [
    containerWidth,
    hasRightPanel,
    isLeftOpen,
    isRightOpen,
    onLeftOpenChange,
  ]);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const layoutContainerWidth =
      containerWidth || node.getBoundingClientRect().width;
    if (!layoutContainerWidth) {
      return;
    }

    const prevContainerWidth = prevContainerWidthRef.current;
    const prevLeftOpen = prevLeftOpenRef.current;
    const containerWidthChanged =
      prevContainerWidth != null &&
      Math.abs(prevContainerWidth - layoutContainerWidth) >= 1;
    const leftOpenChanged =
      prevLeftOpen != null && prevLeftOpen !== effectiveIsLeftOpen;
    const shouldSuspendTransitions = containerWidthChanged || leftOpenChanged;
    if (!hasHydratedRef.current) {
      suspendTransitions(
        [leftPanelRef, handleRef, rightPanelRef],
        transitionRafRef,
      );
      hasHydratedRef.current = true;
    } else if (shouldSuspendTransitions) {
      suspendTransitions(
        [leftPanelRef, handleRef, rightPanelRef],
        transitionRafRef,
      );
    }
    const updatePrevRefs = (): void => {
      prevContainerWidthRef.current = layoutContainerWidth;
      prevLeftOpenRef.current = effectiveIsLeftOpen;
    };

    const canUseDrawerLayout =
      drawerBreakpoint > 0 &&
      hasRightPanel &&
      layoutContainerWidth <= drawerBreakpoint &&
      !forceNonDrawerForFullReview;
    if (canUseDrawerLayout) {
      commitDrawerWidths({
        containerWidth: layoutContainerWidth,
        minRightWidth,
        isOpen: effectiveIsRightOpen,
        node,
        rafRef,
      });
      updatePrevRefs();
      return;
    }

    const openAvailableWidth = getAvailableWidth(layoutContainerWidth);

    if (!hasRightPanel) {
      commitSplitWidths({
        containerWidth: layoutContainerWidth,
        handleWidth: 0,
        nextLeftWidth: layoutContainerWidth,
        rightWidth: 0,
        rightTranslate: 0,
        node,
        rafRef,
        opts: { immediate: true },
      });
      updatePrevRefs();
      return;
    }
    if (!effectiveIsRightOpen) {
      const desiredLeftWidth =
        openAvailableWidth * clampRatio(leftOpenRatioRef.current);
      const { rightWidth: openRightWidth, boundedLeftRatio } = computeOpenSplit(
        {
          containerWidth: layoutContainerWidth,
          minLeftWidth,
          minRightWidth,
          leftWidth: desiredLeftWidth,
        },
      );
      leftOpenRatioRef.current = boundedLeftRatio;
      const nextRightWidth = clampPanelWidth(
        rightWidthRef.current > 0 ? rightWidthRef.current : openRightWidth,
        openAvailableWidth,
      );
      rightWidthRef.current = nextRightWidth;
      commitSplitWidths({
        containerWidth: layoutContainerWidth,
        handleWidth: 0,
        nextLeftWidth: layoutContainerWidth,
        rightWidth: nextRightWidth,
        rightTranslate: nextRightWidth,
        node,
        rafRef,
        opts: { immediate: true },
      });
      updatePrevRefs();
      return;
    }
    if (!isLeftOpen) {
      const rightWidth = openAvailableWidth;
      rightWidthRef.current = rightWidth;
      commitSplitWidths({
        containerWidth: layoutContainerWidth,
        handleWidth: effectiveHandleWidth,
        nextLeftWidth: 0,
        rightWidth,
        rightTranslate: 0,
        node,
        rafRef,
        opts: { immediate: true },
      });
      updatePrevRefs();
      return;
    }

    const desiredLeftWidth =
      openAvailableWidth * clampRatio(leftOpenRatioRef.current);
    const { boundedLeftWidth, rightWidth, boundedLeftRatio } = computeOpenSplit(
      {
        containerWidth: layoutContainerWidth,
        minLeftWidth,
        minRightWidth,
        leftWidth: desiredLeftWidth,
      },
    );
    rightWidthRef.current = rightWidth;
    leftOpenRatioRef.current = boundedLeftRatio;
    if (isLeftOpen && isRightOpen) {
      persistSplitLeftValue(
        storage,
        storageKey,
        lastPersistedLeftValueRef,
        boundedLeftRatio,
      );
    }
    commitSplitWidths({
      containerWidth: layoutContainerWidth,
      handleWidth: effectiveHandleWidth,
      nextLeftWidth: boundedLeftWidth,
      rightWidth,
      rightTranslate: 0,
      node,
      rafRef,
      opts: { immediate: true },
    });
    updatePrevRefs();
    const rafId = rafRef.current;
    return (): void => {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        if (rafRef.current === rafId) {
          rafRef.current = null;
        }
      }
      if (transitionRafRef.current != null) {
        cancelAnimationFrame(transitionRafRef.current);
        transitionRafRef.current = null;
      }
    };
  }, [
    containerWidth,
    effectiveIsLeftOpen,
    effectiveIsRightOpen,
    effectiveHandleWidth,
    drawerBreakpoint,
    forceNonDrawerForFullReview,
    hasRightPanel,
    isDrawerMode,
    isLeftOpen,
    isRightOpen,
    isResizing,
    minLeftWidth,
    minRightWidth,
    hmrVersion,
    storage,
    storageKey,
  ]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    if (event.button !== 0) {
      return;
    }
    const node = containerRef.current;
    const currentContainerWidth = getCurrentContainerWidth(
      containerWidth,
      node,
    );
    if (isDrawerMode || !node || !currentContainerWidth) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = node.getBoundingClientRect();
    containerLeftRef.current = rect.left;
    if (!isLeftOpen) {
      onLeftOpenChange?.(true);
    }
    if (!isRightOpen) {
      onRightOpenChange?.(true);
    }
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent): void => {
      event.preventDefault();
      const node = containerRef.current;
      const currentContainerWidth = getCurrentContainerWidth(
        containerWidth,
        node,
      );
      if (!node || !currentContainerWidth) {
        return;
      }
      const rawLeftWidth = getDragLeftWidth(event, node, containerLeftRef);
      const { boundedLeftWidth, rightWidth, boundedLeftRatio } =
        computeOpenSplit({
          containerWidth: currentContainerWidth,
          minLeftWidth,
          minRightWidth,
          leftWidth: rawLeftWidth,
        });
      rightWidthRef.current = rightWidth;
      leftOpenRatioRef.current = boundedLeftRatio;
      commitSplitWidths({
        containerWidth: currentContainerWidth,
        handleWidth: effectiveHandleWidth,
        nextLeftWidth: boundedLeftWidth,
        rightWidth,
        rightTranslate: 0,
        node,
        rafRef,
      });
    };

    const stopResizing = (event: PointerEvent): void => {
      event.preventDefault();
      const node = containerRef.current;
      const currentContainerWidth = getCurrentContainerWidth(
        containerWidth,
        node,
      );
      if (!node || !currentContainerWidth) {
        setIsResizing(false);
        return;
      }
      const rawLeftWidth = getDragLeftWidth(event, node, containerLeftRef);
      const { boundedLeftWidth, rightWidth, boundedLeftRatio } =
        computeOpenSplit({
          containerWidth: currentContainerWidth,
          minLeftWidth,
          minRightWidth,
          leftWidth: rawLeftWidth,
        });
      rightWidthRef.current = rightWidth;
      leftOpenRatioRef.current = boundedLeftRatio;
      commitSplitWidths({
        containerWidth: currentContainerWidth,
        handleWidth: effectiveHandleWidth,
        nextLeftWidth: boundedLeftWidth,
        rightWidth,
        rightTranslate: 0,
        node,
        rafRef,
        opts: { immediate: true },
      });
      if (isLeftOpen && isRightOpen) {
        persistSplitLeftValue(
          storage,
          storageKey,
          lastPersistedLeftValueRef,
          boundedLeftRatio,
        );
      }
      containerLeftRef.current = null;
      setIsResizing(false);
    };
    const cancelResizing = (): void => {
      containerLeftRef.current = null;
      setIsResizing(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
    window.addEventListener("blur", cancelResizing);

    return (): void => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
      window.removeEventListener("blur", cancelResizing);
      containerLeftRef.current = null;
    };
  }, [
    containerWidth,
    effectiveHandleWidth,
    isLeftOpen,
    isResizing,
    isRightOpen,
    minLeftWidth,
    minRightWidth,
    storage,
    storageKey,
  ]);

  const collapse = (side: SplitSide): void => {
    if (side === "left") {
      if (!isLeftOpen) {
        return;
      }
      enableTransitions(
        [leftPanelRef, handleRef, rightPanelRef],
        transitionRafRef,
      );
      onLeftOpenChange?.(false);
      const node = containerRef.current;
      const currentContainerWidth = getCurrentContainerWidth(
        containerWidth,
        node,
      );
      if (!node || !currentContainerWidth) {
        return;
      }
      const openAvailableWidth = getAvailableWidth(currentContainerWidth);
      const rightWidth = openAvailableWidth;
      rightWidthRef.current = rightWidth;
      commitSplitWidths({
        containerWidth: currentContainerWidth,
        handleWidth: effectiveHandleWidth,
        nextLeftWidth: 0,
        rightWidth,
        rightTranslate: 0,
        node,
        rafRef,
        opts: { immediate: true },
      });
      return;
    }
    if (!isRightOpen || !hasRightPanel) {
      return;
    }
    enableTransitions(
      [leftPanelRef, handleRef, rightPanelRef],
      transitionRafRef,
    );
    onRightOpenChange?.(false);
    const node = containerRef.current;
    const currentContainerWidth = getCurrentContainerWidth(
      containerWidth,
      node,
    );
    if (!node || !currentContainerWidth) {
      return;
    }
    if (isDrawerMode) {
      commitDrawerWidths({
        containerWidth: currentContainerWidth,
        minRightWidth,
        isOpen: false,
        node,
        rafRef,
      });
      return;
    }
    const openAvailableWidth = getAvailableWidth(currentContainerWidth);
    const desiredLeftWidth =
      openAvailableWidth * clampRatio(leftOpenRatioRef.current);
    const { rightWidth: openRightWidth, boundedLeftRatio } = computeOpenSplit({
      containerWidth: currentContainerWidth,
      minLeftWidth,
      minRightWidth,
      leftWidth: desiredLeftWidth,
    });
    leftOpenRatioRef.current = boundedLeftRatio;
    const nextRightWidth = clampPanelWidth(
      rightWidthRef.current > 0 ? rightWidthRef.current : openRightWidth,
      openAvailableWidth,
    );
    rightWidthRef.current = nextRightWidth;
    commitSplitWidths({
      containerWidth: currentContainerWidth,
      handleWidth: 0,
      nextLeftWidth: currentContainerWidth,
      rightWidth: nextRightWidth,
      rightTranslate: nextRightWidth,
      node,
      rafRef,
      opts: { immediate: true },
    });
  };

  const expand = (side: SplitSide): void => {
    const node = containerRef.current;
    const currentContainerWidth = getCurrentContainerWidth(
      containerWidth,
      node,
    );
    if (!node || !currentContainerWidth) {
      return;
    }
    if (side === "left") {
      if (isLeftOpen) {
        return;
      }
      enableTransitions(
        [leftPanelRef, handleRef, rightPanelRef],
        transitionRafRef,
      );
      onLeftOpenChange?.(true);
      const openAvailableWidth = getAvailableWidth(currentContainerWidth);
      const desiredLeftWidth =
        openAvailableWidth * clampRatio(leftOpenRatioRef.current);
      const { boundedLeftWidth, rightWidth, boundedLeftRatio } =
        computeOpenSplit({
          containerWidth: currentContainerWidth,
          minLeftWidth,
          minRightWidth,
          leftWidth: desiredLeftWidth,
        });
      leftOpenRatioRef.current = boundedLeftRatio;
      if (isRightOpen) {
        persistSplitLeftValue(
          storage,
          storageKey,
          lastPersistedLeftValueRef,
          boundedLeftRatio,
        );
      }
      rightWidthRef.current = rightWidth;
      commitSplitWidths({
        containerWidth: currentContainerWidth,
        handleWidth: effectiveHandleWidth,
        nextLeftWidth: boundedLeftWidth,
        rightWidth,
        rightTranslate: 0,
        node,
        rafRef,
        opts: { immediate: true },
      });
      return;
    }
    if (isRightOpen || !hasRightPanel) {
      return;
    }
    enableTransitions(
      [leftPanelRef, handleRef, rightPanelRef],
      transitionRafRef,
    );
    onRightOpenChange?.(true);
    if (isDrawerMode) {
      commitDrawerWidths({
        containerWidth: currentContainerWidth,
        minRightWidth,
        isOpen: true,
        node,
        rafRef,
      });
      return;
    }
    const openAvailableWidth = getAvailableWidth(currentContainerWidth);
    const desiredLeftWidth =
      openAvailableWidth * clampRatio(leftOpenRatioRef.current);
    const { boundedLeftWidth, rightWidth, boundedLeftRatio } = computeOpenSplit(
      {
        containerWidth: currentContainerWidth,
        minLeftWidth,
        minRightWidth,
        leftWidth: desiredLeftWidth,
      },
    );
    leftOpenRatioRef.current = boundedLeftRatio;
    if (isLeftOpen) {
      persistSplitLeftValue(
        storage,
        storageKey,
        lastPersistedLeftValueRef,
        boundedLeftRatio,
      );
    }
    rightWidthRef.current = rightWidth;
    commitSplitWidths({
      containerWidth: currentContainerWidth,
      handleWidth: effectiveHandleWidth,
      nextLeftWidth: boundedLeftWidth,
      rightWidth,
      rightTranslate: 0,
      node,
      rafRef,
      opts: { immediate: true },
    });
  };

  const toggle = (side: SplitSide): void => {
    if (side === "left") {
      if (isLeftOpen) {
        collapse("left");
        return;
      }
      expand("left");
      return;
    }
    if (isRightOpen) {
      collapse("right");
      return;
    }
    expand("right");
  };

  const contextValue: SplitViewContextValue = {
    isLeftOpen: effectiveIsLeftOpen,
    isRightOpen: effectiveIsRightOpen,
    isResizing,
    collapse,
    expand,
    toggle,
  };
  const isHandleVisible =
    hasRightPanel &&
    !isDrawerMode &&
    effectiveIsLeftOpen &&
    effectiveIsRightOpen;
  const handleLeft = `min(calc(100% - ${handleWidth}px), max(0px, ${
    effectiveIsLeftOpen && effectiveIsRightOpen
      ? `calc(var(--split-left-width, 100%) - (${handleWidth}px / 2))`
      : `calc(100% - (${handleWidth}px / 2))`
  }))`;

  return (
    <SplitViewContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={clsx(
          "group/split-view relative h-full w-full min-w-0 overflow-hidden",
          isResizing && "cursor-col-resize",
          className,
        )}
      >
        <div
          ref={leftPanelRef}
          className={clsx(
            "absolute inset-y-0 left-0 min-w-0 overflow-hidden [will-change:width]",
            !effectiveIsLeftOpen && "pointer-events-none",
            "duration-relaxed ease-basic",
            leftClassName,
          )}
          style={{
            width: "var(--split-left-width, 100%)",
            contain: "strict",
            transitionProperty: isResizing ? "none" : "width",
          }}
        >
          <div className="h-full min-w-0">
            <Activity
              mode={effectiveIsLeftOpen ? "visible" : "hidden"}
              name={`${id}-left`}
            >
              {left}
            </Activity>
          </div>
        </div>
        {hasRightPanel && !isDrawerMode && effectiveIsLeftOpen ? (
          <div
            ref={handleRef}
            role="separator"
            aria-orientation="vertical"
            className={clsx(
              "group absolute inset-y-0 z-20 select-none touch-none",
              "cursor-col-resize duration-relaxed ease-basic [will-change:left]",
              isHandleVisible ? "opacity-100" : "opacity-0 pointer-events-none",
              handleClassName,
            )}
            style={{
              width: `${handleWidth}px`,
              left: handleLeft,
              transitionProperty: isResizing ? "none" : "left, opacity",
            }}
            onPointerDown={handlePointerDown}
          >
            <div
              className={clsx(
                "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-token-border transition-colors duration-relaxed ease-basic",
                isResizing
                  ? "bg-token-foreground/25"
                  : "group-hover:bg-token-foreground/25 group-active:bg-token-foreground/25",
              )}
            />
          </div>
        ) : null}
        <div
          ref={rightPanelRef}
          className={clsx(
            "absolute inset-y-0 min-w-0 overflow-hidden [will-change:transform]",
            isDrawerMode
              ? "main-surface z-30 shadow-[-16px_0_32px_rgba(0,0,0,0.28)]"
              : "z-10",
            effectiveIsRightOpen ? "opacity-100" : "opacity-0",
            !effectiveIsRightOpen && "pointer-events-none",
            "duration-relaxed ease-basic",
            rightClassName,
          )}
          style={{
            width: "var(--split-right-width, 0px)",
            minWidth: 0,
            maxWidth: "var(--split-right-width, 0px)",
            right: 0,
            transform: "translateX(var(--split-right-translate, 0px))",
            contain: "strict",
            transitionProperty: isResizing
              ? "none"
              : "width, transform, opacity",
          }}
        >
          {hasRightPanel ? (
            <div className="h-full min-w-0">
              <Activity
                mode={effectiveIsRightOpen ? "visible" : "hidden"}
                name={`${id}-right`}
              >
                <div
                  className={clsx(
                    "h-full w-full min-w-0 transition-opacity duration-relaxed ease-basic",
                    effectiveIsRightOpen ? "opacity-100" : "opacity-0",
                  )}
                  style={{
                    transitionDelay: effectiveIsRightOpen
                      ? `${RIGHT_CONTENT_FADE_DELAY_MS}ms`
                      : "0ms",
                  }}
                >
                  {right}
                </div>
              </Activity>
            </div>
          ) : null}
        </div>
      </div>
    </SplitViewContext.Provider>
  );
}

function useSplitViewHmrVersion(): number {
  const [version, setVersion] = useState(splitViewHmrStore.version);
  useEffect(() => {
    if (!import.meta.hot) {
      return;
    }
    const listener = (): void => {
      setVersion(splitViewHmrStore.version);
    };
    splitViewHmrStore.listeners.add(listener);
    return (): void => {
      splitViewHmrStore.listeners.delete(listener);
    };
  }, []);
  return version;
}

function suspendTransitions(
  refs: Array<{ current: HTMLDivElement | null }>,
  transitionRafRef: { current: number | null },
): void {
  for (const ref of refs) {
    ref.current?.style.setProperty("transition", "none");
  }
  if (transitionRafRef.current != null) {
    cancelAnimationFrame(transitionRafRef.current);
  }
  transitionRafRef.current = requestAnimationFrame(() => {
    transitionRafRef.current = requestAnimationFrame(() => {
      for (const ref of refs) {
        ref.current?.style.removeProperty("transition");
      }
      transitionRafRef.current = null;
    });
  });
}

function enableTransitions(
  refs: Array<{ current: HTMLDivElement | null }>,
  transitionRafRef: { current: number | null },
): void {
  if (transitionRafRef.current != null) {
    cancelAnimationFrame(transitionRafRef.current);
    transitionRafRef.current = null;
  }
  for (const ref of refs) {
    ref.current?.style.removeProperty("transition");
  }
}

function getDragLeftWidth(
  event: PointerEvent,
  node: HTMLDivElement,
  containerLeftRef: { current: number | null },
): number {
  let left = containerLeftRef.current;
  if (left == null) {
    left = node.getBoundingClientRect().left;
    containerLeftRef.current = left;
  }
  return event.clientX - left;
}

function getAvailableWidth(width: number): number {
  return Math.max(0, width);
}

function getCurrentContainerWidth(
  containerWidth: number,
  node: HTMLDivElement | null,
): number {
  if (containerWidth) {
    return containerWidth;
  }
  return node?.getBoundingClientRect().width ?? 0;
}

function clampRatio(nextRatio: number): number {
  return Math.min(Math.max(nextRatio, 0), 1);
}

function getDefaultLeftRatio(defaultLeftPercent?: number): number {
  if (defaultLeftPercent == null) {
    return DEFAULT_LEFT_RATIO;
  }
  return clampRatio(defaultLeftPercent / 100);
}

function getRatioFromWidth(
  openAvailableWidth: number,
  leftWidth: number,
): number {
  if (openAvailableWidth === 0) {
    return 0;
  }
  return clampRatio(leftWidth / openAvailableWidth);
}

function getMaxLeftWidth(
  width: number,
  minLeftWidth: number,
  minRightWidth: number,
): number {
  const availableWidth = getAvailableWidth(width);
  const maxLeftWidth = availableWidth - minRightWidth;
  if (maxLeftWidth <= minLeftWidth) {
    return Math.max(0, availableWidth);
  }
  return Math.max(minLeftWidth, maxLeftWidth);
}

function clampLeftWidth(
  nextWidth: number,
  width: number,
  minLeftWidth: number,
  minRightWidth: number,
): number {
  const availableWidth = getAvailableWidth(width);
  if (availableWidth === 0) {
    return 0;
  }
  const minWidth = Math.min(minLeftWidth, availableWidth);
  const maxWidth = getMaxLeftWidth(width, minLeftWidth, minRightWidth);
  if (maxWidth <= minWidth) {
    return Math.max(0, availableWidth);
  }
  return Math.min(Math.max(nextWidth, minWidth), maxWidth);
}

function clampPanelWidth(width: number, containerWidth: number): number {
  return Math.min(Math.max(width, 0), containerWidth);
}

function computeOpenSplit({
  containerWidth,
  minLeftWidth,
  minRightWidth,
  leftWidth,
}: {
  containerWidth: number;
  minLeftWidth: number;
  minRightWidth: number;
  leftWidth: number;
}): {
  openAvailableWidth: number;
  boundedLeftWidth: number;
  boundedLeftRatio: number;
  rightWidth: number;
} {
  const openAvailableWidth = getAvailableWidth(containerWidth);
  const boundedLeftWidth = clampLeftWidth(
    leftWidth,
    containerWidth,
    minLeftWidth,
    minRightWidth,
  );
  const rightWidth = clampPanelWidth(
    Math.max(0, openAvailableWidth - boundedLeftWidth),
    openAvailableWidth,
  );
  const boundedLeftRatio = getRatioFromWidth(
    openAvailableWidth,
    boundedLeftWidth,
  );
  return { openAvailableWidth, boundedLeftWidth, boundedLeftRatio, rightWidth };
}

function computeDrawerWidth(
  containerWidth: number,
  minRightWidth: number,
): number {
  const minWidth = Math.min(minRightWidth, containerWidth);
  const targetWidth = containerWidth * DRAWER_WIDTH_RATIO;
  return clampPanelWidth(Math.max(minWidth, targetWidth), containerWidth);
}

function commitDrawerWidths({
  containerWidth,
  minRightWidth,
  isOpen,
  node,
  rafRef,
}: {
  containerWidth: number;
  minRightWidth: number;
  isOpen: boolean;
  node: HTMLDivElement;
  rafRef: { current: number | null };
}): void {
  const drawerWidth = computeDrawerWidth(containerWidth, minRightWidth);
  commitSplitWidths({
    containerWidth,
    handleWidth: 0,
    nextLeftWidth: containerWidth,
    rightWidth: drawerWidth,
    rightTranslate: isOpen ? 0 : drawerWidth,
    node,
    rafRef,
    opts: { immediate: true },
  });
}

function persistSplitLeftValue(
  storage: { setItem: (key: string, value: number) => void },
  storageKey: string,
  lastPersistedLeftValueRef: { current: number | null },
  nextLeftValue: number,
): void {
  if (lastPersistedLeftValueRef.current === nextLeftValue) {
    return;
  }

  storage.setItem(storageKey, nextLeftValue);
  lastPersistedLeftValueRef.current = nextLeftValue;
}

function commitSplitWidths({
  containerWidth,
  handleWidth,
  nextLeftWidth,
  rightWidth,
  rightTranslate,
  node,
  rafRef,
  opts,
}: {
  containerWidth: number;
  handleWidth: number;
  nextLeftWidth: number;
  rightWidth?: number;
  rightTranslate?: number;
  node: HTMLDivElement;
  rafRef: { current: number | null };
  opts?: {
    immediate?: boolean;
  };
}): void {
  const availableWidth = getAvailableWidth(containerWidth);
  const boundedLeftWidth = Math.min(Math.max(nextLeftWidth, 0), availableWidth);
  const computedRightWidth = Math.max(0, availableWidth - boundedLeftWidth);
  const boundedRightWidth = clampPanelWidth(
    rightWidth ?? computedRightWidth,
    availableWidth,
  );
  const boundedRightTranslate = clampPanelWidth(
    rightTranslate ?? 0,
    boundedRightWidth,
  );
  const apply = (): void => {
    node.style.setProperty("--split-left-width", `${boundedLeftWidth}px`);
    node.style.setProperty("--split-handle-width", `${handleWidth}px`);
    node.style.setProperty("--split-right-width", `${boundedRightWidth}px`);
    node.style.setProperty(
      "--split-right-translate",
      `${boundedRightTranslate}px`,
    );
  };

  if (rafRef.current != null) {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  if (opts?.immediate) {
    apply();
    return;
  }

  rafRef.current = requestAnimationFrame(apply);
}

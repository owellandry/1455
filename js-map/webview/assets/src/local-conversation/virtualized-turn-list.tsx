import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ThreadScrollMode } from "@/thread-layout/thread-scroll-controller-context-value";
import { useThreadScrollController } from "@/thread-layout/thread-scroll-controller-context-value";

import { buildTurnOffsets, getVisibleTurnRange } from "./virtualized-turns";

export type VirtualizedTurnListApi = {
  scrollToKey: (turnKey: string) => Promise<void>;
  setScrollMode: (mode: ThreadScrollMode) => void;
  getScrollMode: () => ThreadScrollMode;
};

const VIRTUALIZED_TURNS_ESTIMATED_HEIGHT_PX = 280;
const VIRTUALIZED_TURNS_GAP_PX = 12;
const VIRTUALIZED_TURNS_OVERSCAN_COUNT = 6;
const INITIAL_TAIL_RENDER_COUNT = 3;

export function VirtualizedTurnList({
  entries,
  scrollElement,
  renderTurn,
  onApiChange,
  className,
}: {
  entries: Array<{ turnKey: string }>;
  scrollElement: HTMLDivElement | null;
  renderTurn: (turnIndex: number) => React.ReactElement;
  onApiChange?: (api: VirtualizedTurnListApi | null) => void;
  className?: string;
}): React.ReactElement {
  const scrollController = useThreadScrollController();
  const shouldVirtualizeTurns = scrollElement != null;
  const [turnHeightsByKey, setTurnHeightsByKey] = useState<
    Record<string, number>
  >({});
  const [turnsContainerElement, setTurnsContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [turnsViewportSnapshot, setTurnsViewportSnapshot] = useState({
    scrollTopPx: 0,
    viewportHeightPx: 0,
    turnsTopOffsetPx: 0,
  });
  const nextScrollRequestIdRef = useRef(0);
  const scrollRequestResolversRef = useRef(new Map<number, () => void>());
  const [pendingScrollRequest, setPendingScrollRequest] = useState<{
    requestId: number;
    kind: "center";
    turnKey: string;
  } | null>(null);
  const handledScrollRequestIdRef = useRef<number | null>(null);
  const turnHeightsByKeyRef = useRef(turnHeightsByKey);
  const turnOffsetsPxRef = useRef<Array<number>>([]);
  const turnsViewportSnapshotRef = useRef(turnsViewportSnapshot);
  const scrollElementRef = useRef(scrollElement);
  const shouldVirtualizeTurnsRef = useRef(shouldVirtualizeTurns);

  const turnKeys = entries.map((entry) => entry.turnKey);
  const turnHeightsPx = turnKeys.map((turnKey) => {
    return turnHeightsByKey[turnKey] ?? VIRTUALIZED_TURNS_ESTIMATED_HEIGHT_PX;
  });
  const { offsetsPx: turnOffsetsPx, totalHeightPx: turnsTotalHeightPx } =
    buildTurnOffsets({
      heightsPx: turnHeightsPx,
      gapPx: VIRTUALIZED_TURNS_GAP_PX,
    });

  turnHeightsByKeyRef.current = turnHeightsByKey;
  turnOffsetsPxRef.current = turnOffsetsPx;
  turnsViewportSnapshotRef.current = turnsViewportSnapshot;
  scrollElementRef.current = scrollElement;
  shouldVirtualizeTurnsRef.current = shouldVirtualizeTurns;
  const turnIndexByKey = useMemo(() => {
    return new Map(entries.map((entry, index) => [entry.turnKey, index]));
  }, [entries]);

  let visibleTurnStartIndex = 0;
  let visibleTurnEndIndex = entries.length;
  if (shouldVirtualizeTurns) {
    const viewportTopPx = Math.max(
      0,
      turnsViewportSnapshot.scrollTopPx -
        turnsViewportSnapshot.turnsTopOffsetPx,
    );
    const viewportBottomPx =
      viewportTopPx + turnsViewportSnapshot.viewportHeightPx;
    const visibleRange = getVisibleTurnRange({
      offsetsPx: turnOffsetsPx,
      heightsPx: turnHeightsPx,
      viewportTopPx,
      viewportBottomPx,
      overscanCount: VIRTUALIZED_TURNS_OVERSCAN_COUNT,
    });
    visibleTurnStartIndex = visibleRange.startIndex;
    visibleTurnEndIndex = visibleRange.endIndex;

    const pendingTurnIndex =
      pendingScrollRequest == null
        ? undefined
        : turnIndexByKey.get(pendingScrollRequest.turnKey);
    if (pendingTurnIndex != null) {
      visibleTurnStartIndex = Math.max(
        0,
        pendingTurnIndex - VIRTUALIZED_TURNS_OVERSCAN_COUNT,
      );
      visibleTurnEndIndex = Math.min(
        entries.length,
        pendingTurnIndex + VIRTUALIZED_TURNS_OVERSCAN_COUNT + 1,
      );
    }
  } else if (entries.length > INITIAL_TAIL_RENDER_COUNT) {
    visibleTurnStartIndex = entries.length - INITIAL_TAIL_RENDER_COUNT;
  }

  const topSpacerHeightPx = turnOffsetsPx[visibleTurnStartIndex] ?? 0;
  const visibleTurnHeightsPx = turnHeightsPx.slice(
    visibleTurnStartIndex,
    visibleTurnEndIndex,
  );
  const visibleTurnsTotalHeightPx =
    visibleTurnHeightsPx.reduce((total, heightPx) => total + heightPx, 0) +
    Math.max(0, visibleTurnHeightsPx.length - 1) * VIRTUALIZED_TURNS_GAP_PX;
  const bottomSpacerHeightPx = Math.max(
    0,
    turnsTotalHeightPx - topSpacerHeightPx - visibleTurnsTotalHeightPx,
  );
  const measuredTurnCount = Object.keys(turnHeightsByKey).length;

  const settlePendingScrollRequest = useCallback(
    (requestId: number): void => {
      queueMicrotask(() => {
        const resolve = scrollRequestResolversRef.current.get(requestId);
        scrollRequestResolversRef.current.delete(requestId);
        if (resolve != null) {
          resolve();
        }
        setPendingScrollRequest((current) => {
          if (current?.requestId === requestId) {
            return null;
          }
          return current;
        });
        scrollController.setScrollMode("user");
      });
    },
    [scrollController],
  );

  const scrollToKey = useCallback(
    (turnKey: string): Promise<void> => {
      nextScrollRequestIdRef.current += 1;
      const requestId = nextScrollRequestIdRef.current;

      return new Promise<void>((resolve) => {
        handledScrollRequestIdRef.current = null;
        scrollRequestResolversRef.current.set(requestId, resolve);
        scrollController.setScrollMode("programmaticFind");
        setPendingScrollRequest({
          requestId,
          kind: "center",
          turnKey,
        });
      });
    },
    [scrollController],
  );

  useEffect(() => {
    if (onApiChange == null) {
      return;
    }
    onApiChange({
      scrollToKey,
      setScrollMode: scrollController.setScrollMode,
      getScrollMode: scrollController.getScrollMode,
    });
    return (): void => {
      onApiChange(null);
    };
  }, [onApiChange, scrollController, scrollToKey]);

  useEffect(() => {
    const scrollRequestResolvers = scrollRequestResolversRef.current;

    return (): void => {
      for (const resolve of scrollRequestResolvers.values()) {
        resolve();
      }
      scrollRequestResolvers.clear();
      handledScrollRequestIdRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (scrollElement == null) {
      return;
    }

    const updateViewportSnapshot = (): void => {
      const scrollTopPx = scrollElement.scrollTop;
      const viewportHeightPx = scrollElement.clientHeight;
      let turnsTopOffsetPx = 0;
      if (turnsContainerElement != null) {
        const scrollRect = scrollElement.getBoundingClientRect();
        const turnsRect = turnsContainerElement.getBoundingClientRect();
        turnsTopOffsetPx = turnsRect.top - scrollRect.top + scrollTopPx;
      }
      setTurnsViewportSnapshot((current): typeof current => {
        if (
          current.scrollTopPx === scrollTopPx &&
          current.viewportHeightPx === viewportHeightPx &&
          current.turnsTopOffsetPx === turnsTopOffsetPx
        ) {
          return current;
        }
        return {
          scrollTopPx,
          viewportHeightPx,
          turnsTopOffsetPx,
        };
      });
    };

    updateViewportSnapshot();
    scrollElement.addEventListener("scroll", updateViewportSnapshot, {
      passive: true,
    });

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((): void => {
            updateViewportSnapshot();
          });
    if (resizeObserver != null) {
      resizeObserver.observe(scrollElement);
      if (turnsContainerElement != null) {
        resizeObserver.observe(turnsContainerElement);
      }
    }

    return (): void => {
      scrollElement.removeEventListener("scroll", updateViewportSnapshot);
      resizeObserver?.disconnect();
    };
  }, [scrollElement, turnsContainerElement]);

  useLayoutEffect(() => {
    if (scrollElement == null || turnsContainerElement == null) {
      return;
    }
    scrollController.notifyContentLayout();
  }, [scrollController, scrollElement, turnsContainerElement]);

  useLayoutEffect(() => {
    if (!shouldVirtualizeTurns || scrollElement == null) {
      return;
    }
    scrollController.maybeStickToBottom();
  }, [
    entries.length,
    measuredTurnCount,
    scrollController,
    scrollElement,
    shouldVirtualizeTurns,
    turnsTotalHeightPx,
  ]);

  useLayoutEffect(() => {
    if (pendingScrollRequest == null) {
      return;
    }
    if (handledScrollRequestIdRef.current === pendingScrollRequest.requestId) {
      return;
    }
    if (scrollElement == null) {
      return;
    }
    const turnIndex = turnIndexByKey.get(pendingScrollRequest.turnKey);
    if (turnIndex == null) {
      settlePendingScrollRequest(pendingScrollRequest.requestId);
      return;
    }

    handledScrollRequestIdRef.current = pendingScrollRequest.requestId;
    const targetElement = turnsContainerElement?.querySelector<HTMLElement>(
      `[data-content-search-turn-key="${escapeAttributeValue(
        pendingScrollRequest.turnKey,
      )}"]`,
    );
    if (targetElement != null) {
      scrollController.scrollToTopPx(
        getCenteredScrollTopForElement({
          scrollContainer: scrollElement,
          targetElement,
        }),
        "smooth",
      );
      return;
    }

    const turnTopPx = turnOffsetsPx[turnIndex] ?? 0;
    const turnHeightPx =
      turnHeightsByKey[pendingScrollRequest.turnKey] ??
      VIRTUALIZED_TURNS_ESTIMATED_HEIGHT_PX;
    const absoluteTopPx = turnsViewportSnapshot.turnsTopOffsetPx + turnTopPx;
    scrollController.scrollToTopPx(
      getCenteredScrollTop({
        absoluteTopPx,
        turnHeightPx,
        viewportHeightPx: scrollElement.clientHeight,
      }),
      "smooth",
    );
  }, [
    pendingScrollRequest,
    scrollElement,
    scrollController,
    settlePendingScrollRequest,
    turnHeightsByKey,
    turnIndexByKey,
    turnOffsetsPx,
    turnsContainerElement,
    turnsViewportSnapshot.turnsTopOffsetPx,
  ]);

  useLayoutEffect(() => {
    if (pendingScrollRequest == null || scrollElement == null) {
      return;
    }
    const turnIndex = turnIndexByKey.get(pendingScrollRequest.turnKey);
    if (turnIndex == null) {
      return;
    }
    if (turnIndex < visibleTurnStartIndex || turnIndex >= visibleTurnEndIndex) {
      return;
    }

    const targetElement = turnsContainerElement?.querySelector<HTMLElement>(
      `[data-content-search-turn-key="${escapeAttributeValue(
        pendingScrollRequest.turnKey,
      )}"]`,
    );
    if (targetElement == null) {
      return;
    }
    if (!isVisibleWithinContainer(targetElement, scrollElement)) {
      return;
    }
    if (!isCenteredWithinContainer(targetElement, scrollElement)) {
      scrollController.scrollToTopPx(
        getCenteredScrollTopForElement({
          scrollContainer: scrollElement,
          targetElement,
        }),
        "auto",
      );
      return;
    }
    settlePendingScrollRequest(pendingScrollRequest.requestId);
  }, [
    pendingScrollRequest,
    scrollElement,
    scrollController,
    settlePendingScrollRequest,
    turnIndexByKey,
    turnsContainerElement,
    turnsViewportSnapshot.scrollTopPx,
    visibleTurnEndIndex,
    visibleTurnStartIndex,
  ]);

  const onTurnHeightChange = useCallback(
    (turnKey: string, turnIndex: number, nextHeightPx: number): void => {
      const clampedHeightPx = Math.max(1, Math.ceil(nextHeightPx));
      const previousHeightPx =
        turnHeightsByKeyRef.current[turnKey] ??
        VIRTUALIZED_TURNS_ESTIMATED_HEIGHT_PX;
      if (previousHeightPx === clampedHeightPx) {
        return;
      }

      if (
        shouldVirtualizeTurnsRef.current &&
        scrollElementRef.current != null
      ) {
        const heightDeltaPx = clampedHeightPx - previousHeightPx;
        if (heightDeltaPx !== 0) {
          const turnBottomPx =
            (turnOffsetsPxRef.current[turnIndex] ?? 0) + previousHeightPx;
          const viewportTopPx =
            turnsViewportSnapshotRef.current.scrollTopPx -
            turnsViewportSnapshotRef.current.turnsTopOffsetPx;
          scrollController.adjustForMeasuredTurnHeightDelta({
            heightDeltaPx,
            turnBottomPx,
            viewportTopPx,
          });
        }
      }

      setTurnHeightsByKey((currentHeightsByKey) => {
        if (currentHeightsByKey[turnKey] === clampedHeightPx) {
          return currentHeightsByKey;
        }

        const nextHeightsByKey = {
          ...currentHeightsByKey,
          [turnKey]: clampedHeightPx,
        };
        turnHeightsByKeyRef.current = nextHeightsByKey;
        return nextHeightsByKey;
      });
    },
    [scrollController],
  );

  return (
    <div ref={setTurnsContainerElement} className={className ?? "relative"}>
      {topSpacerHeightPx > 0 ? (
        <div aria-hidden="true" style={{ height: `${topSpacerHeightPx}px` }} />
      ) : null}
      <div className="flex flex-col gap-3">
        {entries
          .slice(visibleTurnStartIndex, visibleTurnEndIndex)
          .map((entry, visibleIndex) => {
            const turnIndex = visibleTurnStartIndex + visibleIndex;
            return (
              <MeasuredVirtualizedTurn
                key={`virtualized-turn-${entry.turnKey}`}
                turnKey={entry.turnKey}
                turnIndex={turnIndex}
                onHeightChange={onTurnHeightChange}
              >
                <div data-content-search-turn-key={entry.turnKey}>
                  {renderTurn(turnIndex)}
                </div>
              </MeasuredVirtualizedTurn>
            );
          })}
      </div>
      {bottomSpacerHeightPx > 0 ? (
        <div
          aria-hidden="true"
          style={{ height: `${bottomSpacerHeightPx}px` }}
        />
      ) : null}
    </div>
  );
}

function MeasuredVirtualizedTurn({
  turnKey,
  turnIndex,
  onHeightChange,
  children,
}: {
  turnKey: string;
  turnIndex: number;
  onHeightChange: (
    turnKey: string,
    turnIndex: number,
    heightPx: number,
  ) => void;
  children: React.ReactNode;
}): React.ReactElement {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const previousHeightPxRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const rowElement = rowRef.current;
    if (rowElement == null) {
      return;
    }

    previousHeightPxRef.current = null;
    let animationFrameId: number | null = null;

    const measureHeight = (): void => {
      const nextHeightPx = rowElement.offsetHeight;
      if (previousHeightPxRef.current === nextHeightPx) {
        return;
      }
      previousHeightPxRef.current = nextHeightPx;
      onHeightChange(turnKey, turnIndex, nextHeightPx);
    };

    const scheduleMeasurement = (): void => {
      if (animationFrameId != null) {
        return;
      }
      animationFrameId = window.requestAnimationFrame((): void => {
        animationFrameId = null;
        measureHeight();
      });
    };

    scheduleMeasurement();

    if (typeof ResizeObserver === "undefined") {
      return (): void => {
        if (animationFrameId != null) {
          window.cancelAnimationFrame(animationFrameId);
        }
      };
    }

    const resizeObserver = new ResizeObserver((): void => {
      scheduleMeasurement();
    });
    resizeObserver.observe(rowElement);

    return (): void => {
      resizeObserver.disconnect();
      if (animationFrameId != null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [onHeightChange, turnIndex, turnKey]);

  return <div ref={rowRef}>{children}</div>;
}

function escapeAttributeValue(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape != null) {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
}

function isVisibleWithinContainer(
  element: HTMLElement,
  scrollContainer: HTMLDivElement,
): boolean {
  const elementRect = element.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  return (
    elementRect.bottom > containerRect.top &&
    elementRect.top < containerRect.bottom
  );
}

function isCenteredWithinContainer(
  element: HTMLElement,
  scrollContainer: HTMLDivElement,
): boolean {
  const elementRect = element.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  const elementCenter = elementRect.top + elementRect.height / 2;
  const containerCenter = containerRect.top + containerRect.height / 2;
  return Math.abs(elementCenter - containerCenter) <= 48;
}

function getCenteredScrollTopForElement({
  scrollContainer,
  targetElement,
}: {
  scrollContainer: HTMLDivElement;
  targetElement: HTMLElement;
}): number {
  const scrollRect = scrollContainer.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  const targetTopPx =
    scrollContainer.scrollTop + (targetRect.top - scrollRect.top);
  return getCenteredScrollTop({
    absoluteTopPx: targetTopPx,
    turnHeightPx: targetRect.height,
    viewportHeightPx: scrollContainer.clientHeight,
  });
}

function getCenteredScrollTop({
  absoluteTopPx,
  turnHeightPx,
  viewportHeightPx,
}: {
  absoluteTopPx: number;
  turnHeightPx: number;
  viewportHeightPx: number;
}): number {
  return Math.max(0, absoluteTopPx - viewportHeightPx / 2 + turnHeightPx / 2);
}

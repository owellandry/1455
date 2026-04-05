import clsx from "clsx";
import type { ReactElement, ReactNode, Ref } from "react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { SCROLL_TO_BOTTOM_EPSILON_PX } from "./scroll-constants";
import { THREAD_BODY_INNER_CLASS_NAME } from "./thread-layout";
import {
  ThreadScrollControllerContext,
  type AdjustForMeasuredTurnHeightDeltaParams,
  type ThreadScrollControllerContextValue,
  type ThreadScrollMode,
} from "./thread-scroll-controller-context-value";

const USER_SCROLL_CANCEL_DELTA_PX = 12;
const USER_SCROLL_INTENT_WINDOW_MS = 750;
const PROGRAMMATIC_SCROLL_GUARD_WINDOW_MS = 64;

export type ThreadScrollLayoutRef = {
  scrollToBottom: () => void;
};

export function ThreadScrollLayout({
  children,
  scrollViewClassName,
  contentWrapperClassName,
  onScroll,
  ref,
}: {
  onScroll?: (isNearBottom: boolean) => void;
  ref?: Ref<ThreadScrollLayoutRef>;
  children: ReactNode;
  scrollViewClassName?: string;
  contentWrapperClassName?: string;
}): ReactElement {
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [isScrolledFromBottomState, setIsScrolledFromBottomState] =
    useState(false);
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const scrollModeRef = useRef<ThreadScrollMode>("stickToBottom");
  const userScrollIntentUntilMsRef = useRef(0);
  const programmaticScrollGuardUntilMsRef = useRef(0);

  useEffect(() => {
    scrollElementRef.current = scrollElement;
  }, [scrollElement]);

  const setScrollMode = useCallback((nextMode: ThreadScrollMode): void => {
    if (scrollModeRef.current === nextMode) {
      return;
    }
    scrollModeRef.current = nextMode;
  }, []);

  const getScrollMode = useCallback((): ThreadScrollMode => {
    return scrollModeRef.current;
  }, []);

  const scrollWithGuard = useCallback(
    (
      behavior: ScrollBehavior,
      getTopPx: (node: HTMLDivElement) => number,
    ): void => {
      const currentScrollElement = scrollElementRef.current;
      if (currentScrollElement == null) {
        return;
      }
      const nextTopPx = Math.max(0, getTopPx(currentScrollElement));
      programmaticScrollGuardUntilMsRef.current =
        performance.now() + PROGRAMMATIC_SCROLL_GUARD_WINDOW_MS;
      currentScrollElement.scrollTo({
        behavior,
        top: nextTopPx,
      });
    },
    [],
  );

  const scrollToTopPx = useCallback(
    (topPx: number, behavior: ScrollBehavior): void => {
      scrollWithGuard(behavior, () => topPx);
    },
    [scrollWithGuard],
  );

  const maybeStickToBottom = useCallback((): void => {
    if (scrollModeRef.current !== "stickToBottom") {
      return;
    }
    scrollWithGuard("auto", (node) => node.scrollHeight);
  }, [scrollWithGuard]);

  const notifyContentLayout = useCallback((): void => {
    maybeStickToBottom();
  }, [maybeStickToBottom]);

  const adjustForMeasuredTurnHeightDelta = useCallback(
    ({
      heightDeltaPx,
      turnBottomPx,
      viewportTopPx,
    }: AdjustForMeasuredTurnHeightDeltaParams): void => {
      const currentScrollElement = scrollElementRef.current;
      if (currentScrollElement == null || heightDeltaPx === 0) {
        return;
      }
      if (scrollModeRef.current === "programmaticFind") {
        return;
      }

      if (scrollModeRef.current === "stickToBottom") {
        scrollWithGuard("auto", (node) => node.scrollTop + heightDeltaPx);
        return;
      }

      if (turnBottomPx < viewportTopPx) {
        scrollWithGuard("auto", (node) => node.scrollTop + heightDeltaPx);
      }
    },
    [scrollWithGuard],
  );

  const scrollToBottom = useCallback((): void => {
    setScrollMode("stickToBottom");
    scrollWithGuard("smooth", (node) => node.scrollHeight);
  }, [scrollWithGuard, setScrollMode]);

  const jumpToBottom = useCallback((): void => {
    setScrollMode("stickToBottom");
    scrollWithGuard("auto", (node) => node.scrollHeight);
  }, [scrollWithGuard, setScrollMode]);

  const suppressAutoStickToBottom = useCallback((): void => {
    setScrollMode("user");
  }, [setScrollMode]);

  useEffect(() => {
    if (scrollElement == null) {
      return;
    }

    let isActive = true;
    const updateScrolledState = (nearBottom: boolean): void => {
      if (!isActive) {
        return;
      }

      onScroll?.(nearBottom);
      setIsScrolledFromBottomState(!nearBottom);
    };

    const handleWheel = (event: WheelEvent): void => {
      if (event.deltaY !== 0) {
        userScrollIntentUntilMsRef.current =
          performance.now() + USER_SCROLL_INTENT_WINDOW_MS;
      }
      if (event.deltaY < -USER_SCROLL_CANCEL_DELTA_PX) {
        setScrollMode("user");
      }
    };

    const handlePointerDown = (): void => {
      userScrollIntentUntilMsRef.current =
        performance.now() + USER_SCROLL_INTENT_WINDOW_MS;
    };

    const handleScroll = (): void => {
      const nearBottom = isNearBottom(scrollElement);
      if (scrollModeRef.current !== "programmaticFind") {
        if (nearBottom) {
          setScrollMode("stickToBottom");
        } else if (
          performance.now() > programmaticScrollGuardUntilMsRef.current &&
          performance.now() <= userScrollIntentUntilMsRef.current
        ) {
          setScrollMode("user");
        }
      }
      updateScrolledState(nearBottom);
    };

    queueMicrotask(() => {
      updateScrolledState(isNearBottom(scrollElement));
    });
    const stickToBottomOnAttachAnimationFrameId = window.requestAnimationFrame(
      (): void => {
        maybeStickToBottom();
      },
    );

    scrollElement.addEventListener("wheel", handleWheel, {
      passive: true,
    });
    scrollElement.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    scrollElement.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return (): void => {
      isActive = false;
      window.cancelAnimationFrame(stickToBottomOnAttachAnimationFrameId);
      scrollElement.removeEventListener("wheel", handleWheel);
      scrollElement.removeEventListener("pointerdown", handlePointerDown);
      scrollElement.removeEventListener("scroll", handleScroll);
    };
  }, [maybeStickToBottom, scrollElement, setScrollMode, onScroll]);

  useImperativeHandle(ref, () => ({
    scrollToBottom,
  }));

  const contextValue = useMemo<ThreadScrollControllerContextValue>(() => {
    return {
      isScrolledFromBottom:
        scrollElement == null ? false : isScrolledFromBottomState,
      scrollElement,
      notifyContentLayout,
      suppressAutoStickToBottom,
      setScrollMode,
      getScrollMode,
      maybeStickToBottom,
      scrollToBottom,
      jumpToBottom,
      scrollToTopPx,
      adjustForMeasuredTurnHeightDelta,
    };
  }, [
    adjustForMeasuredTurnHeightDelta,
    getScrollMode,
    isScrolledFromBottomState,
    jumpToBottom,
    maybeStickToBottom,
    notifyContentLayout,
    scrollElement,
    scrollToBottom,
    scrollToTopPx,
    setScrollMode,
    suppressAutoStickToBottom,
  ]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const setScrollContainerRef = useCallback(
    (node: HTMLDivElement | null): void => {
      scrollContainerRef.current = node;
      setScrollElement(node);
    },
    [setScrollElement],
  );

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer == null) {
      return;
    }

    notifyContentLayout();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver((): void => {
      notifyContentLayout();
    });
    resizeObserver.observe(scrollContainer);
    const contentNode = scrollContainer.firstElementChild;
    if (contentNode != null) {
      resizeObserver.observe(contentNode);
    }

    return (): void => {
      resizeObserver.disconnect();
    };
  }, [notifyContentLayout]);

  const content = contentWrapperClassName ? (
    <div className={contentWrapperClassName}>{children}</div>
  ) : (
    children
  );

  return (
    <ThreadScrollControllerContext value={contextValue}>
      <div className="h-full" style={{ contentVisibility: "auto" }}>
        <div
          ref={setScrollContainerRef}
          className={clsx(
            "relative h-full vertical-scroll-fade-mask-top [--edge-fade-distance:2rem] overflow-y-auto [overflow-anchor:none] [scrollbar-gutter:stable] pb-8 pt-[var(--edge-fade-distance)] [container-name:thread-content] [container-type:inline-size]",
            scrollViewClassName,
          )}
        >
          <div className={THREAD_BODY_INNER_CLASS_NAME}>{content}</div>
        </div>
      </div>
    </ThreadScrollControllerContext>
  );
}

function isNearBottom(node: HTMLDivElement): boolean {
  const distanceToBottom =
    node.scrollHeight - node.scrollTop - node.clientHeight;
  return distanceToBottom <= SCROLL_TO_BOTTOM_EPSILON_PX;
}

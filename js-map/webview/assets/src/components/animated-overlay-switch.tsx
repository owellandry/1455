import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type AnimatedOverlaySwitchControls = {
  isOverlayOpen: boolean;
  openOverlay: () => void;
  closeOverlay: () => void;
  closeOverlayAndThen: (afterClose: () => void) => void;
};

const RELAXED_TRANSITION_DURATION_MS = 300;
const ENTER_TRANSITION_EASING = "var(--cubic-enter)";

export function AnimatedOverlaySwitch({
  children,
  open,
  baseContent,
  overlayContent,
  overlayHeader,
  overlayHeightOffset,
  minHeight,
  sizeDurationMs = RELAXED_TRANSITION_DURATION_MS,
  baseFadeDurationMs = RELAXED_TRANSITION_DURATION_MS,
  overlayFadeDurationMs,
  sizeEasing = ENTER_TRANSITION_EASING,
  baseContentClassName,
  overlayContentClassName,
  overlayHeaderClassName,
}: {
  children?: (controls: AnimatedOverlaySwitchControls) => ReactNode;
  open: boolean;
  baseContent:
    | ReactNode
    | ((controls: AnimatedOverlaySwitchControls) => ReactNode);
  overlayContent: (controls: AnimatedOverlaySwitchControls) => ReactNode;
  overlayHeader?: ReactNode;
  overlayHeightOffset: number;
  minHeight: number;
  sizeDurationMs?: number;
  baseFadeDurationMs?: number;
  overlayFadeDurationMs: number;
  sizeEasing?: string;
  baseContentClassName?: string;
  overlayContentClassName?: string;
  overlayHeaderClassName?: string;
}): ReactElement {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isOverlayContentVisible, setIsOverlayContentVisible] = useState(false);
  const [isBaseContentVisible, setIsBaseContentVisible] = useState(true);
  const baseContentRef = useRef<HTMLDivElement | null>(null);
  const timerRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [baseContentHeight, setBaseContentHeight] = useState<number | null>(
    null,
  );

  const clearTimers = (): void => {
    timerRefs.current.forEach((timer) => {
      clearTimeout(timer);
    });
    timerRefs.current = [];
  };

  const resetOverlayState = (): void => {
    clearTimers();
    setIsOverlayOpen(false);
    setIsOverlayContentVisible(false);
    setIsBaseContentVisible(true);
  };

  const closeOverlay = (): void => {
    clearTimers();
    setIsOverlayContentVisible(false);
    const shrinkTimer = setTimeout(() => {
      setIsOverlayOpen(false);
    }, overlayFadeDurationMs);
    const showBaseContentTimer = setTimeout(() => {
      setIsBaseContentVisible(true);
    }, overlayFadeDurationMs + sizeDurationMs);
    timerRefs.current.push(shrinkTimer, showBaseContentTimer);
  };

  const closeOverlayAndThen = (afterClose: () => void): void => {
    clearTimers();
    setIsOverlayContentVisible(false);
    const shrinkTimer = setTimeout(() => {
      setIsOverlayOpen(false);
      afterClose();
    }, overlayFadeDurationMs);
    const showBaseContentTimer = setTimeout(() => {
      setIsBaseContentVisible(true);
    }, overlayFadeDurationMs + sizeDurationMs);
    timerRefs.current.push(shrinkTimer, showBaseContentTimer);
  };

  const openOverlay = (): void => {
    clearTimers();
    setIsOverlayContentVisible(false);
    setIsBaseContentVisible(false);
    const expandTimer = setTimeout(() => {
      setIsOverlayOpen(true);
    }, baseFadeDurationMs);
    const showOverlayTimer = setTimeout(() => {
      setIsOverlayContentVisible(true);
    }, baseFadeDurationMs + sizeDurationMs);
    timerRefs.current.push(expandTimer, showOverlayTimer);
  };

  useEffect(() => {
    resetOverlayState();
  }, [open]);

  useLayoutEffect(() => {
    const basePane = baseContentRef.current;
    if (basePane == null) {
      return;
    }

    const updateBaseContentHeight = (): void => {
      setBaseContentHeight(basePane.scrollHeight);
    };

    updateBaseContentHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const baseObserver = new ResizeObserver(() => {
      updateBaseContentHeight();
    });
    baseObserver.observe(basePane);

    return (): void => {
      baseObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    return (): void => {
      clearTimers();
    };
  }, []);

  const activeHeight = isOverlayOpen
    ? Math.max(
        (baseContentHeight ?? minHeight) + overlayHeightOffset,
        minHeight,
      )
    : baseContentHeight;
  const controls = {
    isOverlayOpen,
    openOverlay,
    closeOverlay,
    closeOverlayAndThen,
  };
  const resolvedBaseContent =
    typeof baseContent === "function" ? baseContent(controls) : baseContent;

  return (
    <div
      className="relative"
      style={
        activeHeight != null
          ? {
              height: activeHeight,
              transition: `height ${sizeDurationMs}ms ${sizeEasing}`,
            }
          : undefined
      }
    >
      {children?.(controls)}
      {overlayHeader ? (
        <div
          className={clsx(
            "absolute inset-x-0 top-0 z-10 transition-opacity",
            isOverlayOpen ? "opacity-100" : "opacity-0",
            overlayHeaderClassName,
          )}
          style={{
            transitionDuration: `${baseFadeDurationMs}ms`,
          }}
        >
          {overlayHeader}
        </div>
      ) : null}
      <div
        ref={baseContentRef}
        className={clsx(
          "w-full transition-opacity",
          isBaseContentVisible
            ? "opacity-100"
            : "pointer-events-none opacity-0",
          baseContentClassName,
        )}
        style={{
          transitionDuration: `${baseFadeDurationMs}ms`,
        }}
      >
        {resolvedBaseContent}
      </div>
      <div
        className={clsx(
          "absolute inset-0 transition-opacity",
          isOverlayContentVisible
            ? "opacity-100"
            : "pointer-events-none opacity-0",
          overlayContentClassName,
        )}
        style={{
          minHeight,
          transitionDuration: `${overlayFadeDurationMs}ms`,
        }}
      >
        {overlayContent(controls)}
      </div>
    </div>
  );
}

import clsx from "clsx";
import type React from "react";
import { useLayoutEffect, useRef } from "react";

const SCROLL_BOTTOM_EPSILON_PX = 24;

export type AutoScrollListViewState = "preview" | "expanded" | "collapsed";

export function AutoScrollList({
  items,
  className,
  contentClassName,
  maxHeightByState,
  viewState = "preview",
  autoScrollToBottom = true,
  disableMaxHeight = false,
  deferAutoScrollOnEnable = false,
}: {
  items: Array<{
    key: string;
    node: React.ReactNode;
  }>;
  className?: string;
  contentClassName?: string;
  maxHeightByState: Record<AutoScrollListViewState, string>;
  viewState?: AutoScrollListViewState;
  autoScrollToBottom?: boolean;
  disableMaxHeight?: boolean;
  deferAutoScrollOnEnable?: boolean;
}): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const hasMountedRef = useRef(false);
  const previousAutoScrollToBottomRef = useRef(autoScrollToBottom);
  const pendingScrollFrameRef = useRef<number | null>(null);
  const lastItemKey = items.at(-1)?.key ?? null;

  const handleScroll = (): void => {
    const node = scrollRef.current;
    if (node == null) {
      shouldAutoScrollRef.current = true;
      return;
    }
    const distanceToBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldAutoScrollRef.current = distanceToBottom <= SCROLL_BOTTOM_EPSILON_PX;
  };

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node == null) {
      return;
    }

    const autoScrollJustEnabled =
      autoScrollToBottom && !previousAutoScrollToBottomRef.current;
    previousAutoScrollToBottomRef.current = autoScrollToBottom;
    if (autoScrollJustEnabled) {
      shouldAutoScrollRef.current = true;
    }

    if (!autoScrollToBottom) {
      hasMountedRef.current = true;
      return;
    }
    if (!shouldAutoScrollRef.current && !autoScrollJustEnabled) {
      hasMountedRef.current = true;
      return;
    }

    if (
      autoScrollJustEnabled &&
      deferAutoScrollOnEnable &&
      typeof window !== "undefined"
    ) {
      if (pendingScrollFrameRef.current != null) {
        window.cancelAnimationFrame(pendingScrollFrameRef.current);
      }
      pendingScrollFrameRef.current = window.requestAnimationFrame(() => {
        pendingScrollFrameRef.current = null;
        const currentNode = scrollRef.current;
        if (currentNode == null) {
          return;
        }
        currentNode.scrollTo({
          top: currentNode.scrollHeight,
          behavior: hasMountedRef.current ? "smooth" : "auto",
        });
        hasMountedRef.current = true;
      });
      return (): void => {
        if (pendingScrollFrameRef.current != null) {
          window.cancelAnimationFrame(pendingScrollFrameRef.current);
          pendingScrollFrameRef.current = null;
        }
      };
    }

    node.scrollTo({
      top: node.scrollHeight,
      behavior: hasMountedRef.current ? "smooth" : "auto",
    });
    hasMountedRef.current = true;
  }, [autoScrollToBottom, deferAutoScrollOnEnable, items.length, lastItemKey]);

  const maxHeight =
    viewState === "expanded"
      ? maxHeightByState.expanded
      : viewState === "collapsed"
        ? maxHeightByState.collapsed
        : maxHeightByState.preview;

  return (
    <div
      ref={scrollRef}
      className={clsx(
        "vertical-scroll-fade-mask [--edge-fade-distance:1.5rem] overflow-y-auto scroll-contain",
        className,
      )}
      style={disableMaxHeight ? undefined : { maxHeight }}
      onScroll={handleScroll}
    >
      <div
        className={clsx(
          "flex flex-col gap-1",
          contentClassName,
          viewState === "preview" && "pb-1",
        )}
      >
        {items.map(({ key, node }) => (
          <div key={key}>{node}</div>
        ))}
      </div>
    </div>
  );
}

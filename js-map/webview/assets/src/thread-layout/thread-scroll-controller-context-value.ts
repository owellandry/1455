import { createContext, use } from "react";

export type ThreadScrollMode = "stickToBottom" | "user" | "programmaticFind";

export type AdjustForMeasuredTurnHeightDeltaParams = {
  heightDeltaPx: number;
  turnBottomPx: number;
  viewportTopPx: number;
};

export type ThreadScrollControllerContextValue = {
  isScrolledFromBottom: boolean;
  scrollElement: HTMLDivElement | null;
  notifyContentLayout: () => void;
  suppressAutoStickToBottom: () => void;
  setScrollMode: (mode: ThreadScrollMode) => void;
  getScrollMode: () => ThreadScrollMode;
  maybeStickToBottom: () => void;
  scrollToBottom: () => void;
  jumpToBottom: () => void;
  scrollToTopPx: (topPx: number, behavior: ScrollBehavior) => void;
  adjustForMeasuredTurnHeightDelta: (
    params: AdjustForMeasuredTurnHeightDeltaParams,
  ) => void;
};

export const ThreadScrollControllerContext =
  createContext<ThreadScrollControllerContextValue | null>(null);

export function useThreadScrollController(): ThreadScrollControllerContextValue {
  const controller = use(ThreadScrollControllerContext);
  if (controller == null) {
    throw new Error(
      "useThreadScrollController must be used within ThreadScrollLayout",
    );
  }
  return controller;
}

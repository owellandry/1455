export type SplitViewLayoutMode = "collapsed" | "split" | "expanded";

export function useSplitViewLayoutMode({
  layoutMode,
  setLayoutMode,
  openRightPanelModeWhenCollapsed = "split",
}: {
  layoutMode: SplitViewLayoutMode;
  setLayoutMode: (nextLayoutMode: SplitViewLayoutMode) => void;
  openRightPanelModeWhenCollapsed?: "split" | "expanded";
}): {
  handleLeftPanelOpenChange: (isOpen: boolean) => void;
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  setRightPanelOpen: (isOpen: boolean) => void;
  showInlineComposer: boolean;
} {
  const isLeftPanelOpen = layoutMode !== "expanded";
  const isRightPanelOpen = layoutMode !== "collapsed";
  const setRightPanelOpen = (isOpen: boolean): void => {
    const nextLayoutMode =
      isOpen && layoutMode === "collapsed"
        ? openRightPanelModeWhenCollapsed
        : getNextSplitViewLayoutMode({
            layoutMode,
            side: "right",
            isOpen,
          });
    if (nextLayoutMode === layoutMode) {
      return;
    }
    setLayoutMode(nextLayoutMode);
  };
  const handleLeftPanelOpenChange = (isOpen: boolean): void => {
    const nextLayoutMode = getNextSplitViewLayoutMode({
      layoutMode,
      side: "left",
      isOpen,
    });
    if (nextLayoutMode === layoutMode) {
      return;
    }
    setLayoutMode(nextLayoutMode);
  };

  return {
    handleLeftPanelOpenChange,
    isLeftPanelOpen,
    isRightPanelOpen,
    setRightPanelOpen,
    showInlineComposer: isLeftPanelOpen,
  };
}

export function getSplitViewLayoutModeFromPanelOpenState({
  isLeftPanelOpen,
  isRightPanelOpen,
}: {
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
}): SplitViewLayoutMode {
  if (isLeftPanelOpen && isRightPanelOpen) {
    return "split";
  }
  if (isRightPanelOpen) {
    return "expanded";
  }
  return "collapsed";
}

export function getNextSplitViewLayoutMode({
  layoutMode,
  side,
  isOpen,
}: {
  layoutMode: SplitViewLayoutMode;
  side: "left" | "right";
  isOpen: boolean;
}): SplitViewLayoutMode {
  const nextLeftPanelOpen =
    side === "left" ? isOpen : layoutMode !== "expanded";
  const nextRightPanelOpen =
    side === "right" ? isOpen : layoutMode !== "collapsed";
  return getSplitViewLayoutModeFromPanelOpenState({
    isLeftPanelOpen: nextLeftPanelOpen,
    isRightPanelOpen: nextRightPanelOpen,
  });
}

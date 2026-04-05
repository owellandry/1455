import { SplitView } from "@/components/split-view";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  usePanelOpenState,
} from "@/panels";

/**
 * Persists the two-panel thread layout preference + renders header/rails.
 */
export function ThreadPageLayout({
  leftPanel,
  rightPanel,
  bottomPanel,
  isBottomPanelOpen = false,
  animateBottomPanel = false,
  setIsBottomPanelOpen,
  isLeftPanelOpen = true,
  setIsLeftPanelOpen,
  isRightPanelOpen = true,
  setIsRightPanelOpen,
}: {
  leftPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  bottomPanel?: React.ReactNode;
  isBottomPanelOpen?: boolean;
  animateBottomPanel?: boolean;
  setIsBottomPanelOpen?: (isBottomPanelOpen: boolean) => void;
  isLeftPanelOpen?: boolean;
  setIsLeftPanelOpen?: (isLeftPanelOpen: boolean) => void;
  isRightPanelOpen?: boolean;
  setIsRightPanelOpen?: (isRightPanelOpen: boolean) => void;
}): React.ReactElement {
  const isBottomEnabled = !!bottomPanel;
  const bottomRef = usePanelOpenState(isBottomPanelOpen, isBottomEnabled);
  const bottomPanelId = `bottom-panel-${
    isBottomPanelOpen ? "open" : "collapsed"
  }`;
  const bottomDefaultSize = isBottomPanelOpen ? 30 : 0;
  const bottomMin = 20;
  const bottomMax = 75;
  const horizontal = (
    <SplitView
      id="thread-horizontal"
      className="h-full"
      left={leftPanel}
      right={rightPanel ?? null}
      minLeftWidth={240}
      isLeftOpen={isLeftPanelOpen}
      onLeftOpenChange={setIsLeftPanelOpen}
      isRightOpen={isRightPanelOpen}
      onRightOpenChange={setIsRightPanelOpen}
    />
  );

  if (!isBottomEnabled) {
    return horizontal;
  }

  return (
    <PanelGroup
      className={animateBottomPanel ? "panel-animated h-full" : "h-full"}
      autoSaveId="thread-vertical"
      direction="vertical"
    >
      <Panel defaultSize={70} minSize={25}>
        {horizontal}
      </Panel>
      <PanelResizeHandle />
      <Panel
        panelRef={bottomRef}
        id={bottomPanelId}
        collapsible
        onCollapse={() => {
          if (!isBottomPanelOpen) {
            return;
          }
          setIsBottomPanelOpen?.(false);
        }}
        onExpand={() => {
          if (isBottomPanelOpen) {
            return;
          }
          setIsBottomPanelOpen?.(true);
        }}
        defaultSize={bottomDefaultSize}
        collapsedSize={0}
        minSize={bottomMin}
        maxSize={bottomMax}
      >
        {bottomPanel}
      </Panel>
    </PanelGroup>
  );
}

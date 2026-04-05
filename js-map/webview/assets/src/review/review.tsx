import { useScope, useSignal } from "maitai";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";
import { appShellSidebarOpen$ } from "@/components/app/app-shell-state";
import { setContentSearchDefaultDomainForOpen } from "@/content-search/search-model";
import { diffViewMode$ } from "@/diff/diff-view-mode";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";
import { useResizeObserver } from "@/utils/use-resize-observer";

import { ReviewBodySwitch } from "./review-body-switch";
import { ReviewDiffExpansionController } from "./review-diff-expansion-controller";
import { ReviewHeaderContainer } from "./review-header-container";
import { ReviewRevertDialogContainer } from "./review-revert-dialog-container";
import { ReviewRuntimeBridge } from "./review-runtime-bridge";
import { ReviewStageActionsPillContainer } from "./review-stage-actions-pill-container";

const FORCE_UNIFIED_VIEW_WIDTH = 800;
const SIDEBAR_TRANSITION_LOCK_MS = 320;

export function Review({
  conversationTurns = [],
  expandedActionsPortalTarget,
  isAgentWorking = false,
  lastTurnDiff,
}: {
  conversationTurns?: Array<AppServerConversationTurn>;
  expandedActionsPortalTarget?: HTMLElement | null;
  isAgentWorking?: boolean;
  lastTurnDiff: string | null;
}): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const rawDiffMode = useSignal(diffViewMode$);
  const isSidebarOpen = useSignal(appShellSidebarOpen$);
  const { containerRef, diffResizeRef, isDiffSmall } =
    useLockedReviewDiffSizing(isSidebarOpen);
  const setReviewContainerRef = useCallback(
    (node: HTMLDivElement | null): void => {
      containerRef(node);
    },
    [containerRef],
  );
  const diffMode = isDiffSmall ? "unified" : rawDiffMode;

  return (
    <>
      <ReviewRuntimeBridge
        conversationTurns={conversationTurns}
        isAgentWorking={isAgentWorking}
        lastTurnDiff={lastTurnDiff}
      />
      <ReviewDiffExpansionController>
        <div
          ref={setReviewContainerRef}
          className="relative grid h-full min-h-0 w-full grid-rows-[auto_1fr]"
          onFocusCapture={() => {
            setContentSearchDefaultDomainForOpen(scope, "diff");
          }}
          onMouseDownCapture={() => {
            setContentSearchDefaultDomainForOpen(scope, "diff");
          }}
        >
          <ReviewHeaderContainer isSmall={isDiffSmall} />
          <ReviewBodySwitch diffMode={diffMode} diffResizeRef={diffResizeRef} />
          <ReviewStageActionsPillContainer
            expandedActionsPortalTarget={expandedActionsPortalTarget ?? null}
            isAgentWorking={isAgentWorking}
          />
          <ReviewRevertDialogContainer />
        </div>
      </ReviewDiffExpansionController>
    </>
  );
}

function useLockedReviewDiffSizing(isSidebarOpen: boolean | null): {
  containerRef: (instance: HTMLDivElement | null) => void;
  diffResizeRef: (instance: HTMLDivElement | null) => void;
  isDiffSmall: boolean;
} {
  const [isSmall, setIsSmall] = useState(false);
  const [isDiffSmallOverride, setIsDiffSmallOverride] = useState<
    boolean | null
  >(null);
  const isDiffModeLockedRef = useRef(false);
  const lockTimeoutRef = useRef<number | null>(null);
  const prevSidebarOpenRef = useRef<boolean | null>(isSidebarOpen);
  const pendingIsSmallRef = useRef<boolean | null>(null);
  const pendingDiffIsSmallRef = useRef<boolean | null | undefined>(undefined);

  const containerRef = useResizeObserver((entry) => {
    const newIsSmall = entry.contentRect.width < FORCE_UNIFIED_VIEW_WIDTH;
    if (isDiffModeLockedRef.current) {
      pendingIsSmallRef.current = newIsSmall;
      return;
    }
    setIsSmall((previous) => (previous === newIsSmall ? previous : newIsSmall));
  });
  const diffResizeRef = useResizeObserver<HTMLDivElement>((entry) => {
    const nextDiffIsSmall =
      entry.contentRect.width > 0
        ? entry.contentRect.width < FORCE_UNIFIED_VIEW_WIDTH
        : null;
    if (isDiffModeLockedRef.current) {
      pendingDiffIsSmallRef.current = nextDiffIsSmall;
      return;
    }
    setIsDiffSmallOverride((previous) =>
      previous === nextDiffIsSmall ? previous : nextDiffIsSmall,
    );
  });

  useEffect(() => {
    if (isSidebarOpen == null) {
      return;
    }
    const previousSidebarOpen = prevSidebarOpenRef.current;
    prevSidebarOpenRef.current = isSidebarOpen;
    if (previousSidebarOpen == null || previousSidebarOpen === isSidebarOpen) {
      return;
    }

    isDiffModeLockedRef.current = true;
    pendingIsSmallRef.current = null;
    pendingDiffIsSmallRef.current = undefined;

    if (lockTimeoutRef.current != null) {
      window.clearTimeout(lockTimeoutRef.current);
    }
    lockTimeoutRef.current = window.setTimeout(() => {
      isDiffModeLockedRef.current = false;
      const pendingIsSmall = pendingIsSmallRef.current;
      const pendingDiffIsSmall = pendingDiffIsSmallRef.current;
      pendingIsSmallRef.current = null;
      pendingDiffIsSmallRef.current = undefined;

      if (pendingIsSmall != null) {
        setIsSmall((previous) =>
          previous === pendingIsSmall ? previous : pendingIsSmall,
        );
      }
      if (pendingDiffIsSmall !== undefined) {
        setIsDiffSmallOverride((previous) =>
          previous === pendingDiffIsSmall ? previous : pendingDiffIsSmall,
        );
      }
      lockTimeoutRef.current = null;
    }, SIDEBAR_TRANSITION_LOCK_MS);

    return (): void => {
      if (lockTimeoutRef.current != null) {
        window.clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
      isDiffModeLockedRef.current = false;
      pendingIsSmallRef.current = null;
      pendingDiffIsSmallRef.current = undefined;
    };
  }, [isSidebarOpen]);

  const isDiffSmall = isDiffSmallOverride ?? isSmall;

  return { containerRef, diffResizeRef, isDiffSmall };
}

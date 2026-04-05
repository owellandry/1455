import { useScope, useSignal } from "maitai";
import { useEffect, useEffectEvent, useRef } from "react";

import { useAppServerManagerForHost } from "@/app-server/app-server-manager-hooks";
import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { addCheckGitIndexForChangesListener } from "./check-git-index-for-changes";
import { setReviewConversationTurns } from "./review-conversation-files-model";
import {
  resetReviewOptimisticDiffs,
  reviewShouldResetOptimisticDiffs$,
  reviewSnapshotMetrics$,
} from "./review-diff-state-model";
import {
  refetchReviewGitChanges,
  refetchReviewGitIndexInfo,
  shouldFetchBranchChanges$,
  startReviewGitChangesRefetch,
  startReviewGitIndexRefresh,
  setReviewLastTurnDiff,
  shouldFetchStagedAndUnstagedChanges$,
} from "./review-repository-model";

export function ReviewRuntimeBridge({
  conversationTurns,
  isAgentWorking,
  lastTurnDiff,
}: {
  conversationTurns: Array<AppServerConversationTurn>;
  isAgentWorking: boolean;
  lastTurnDiff: string | null;
}): null {
  const scope = useScope(ThreadRouteScope);
  const snapshotMetrics = useSignal(reviewSnapshotMetrics$);
  const shouldFetchBranchChanges = useSignal(shouldFetchBranchChanges$);
  const shouldFetchStagedAndUnstagedChanges = useSignal(
    shouldFetchStagedAndUnstagedChanges$,
  );
  const shouldResetOptimisticDiffs = useSignal(
    reviewShouldResetOptimisticDiffs$,
  );
  const appServerManager = useAppServerManagerForHost(scope.value.hostId);
  const previousIsAgentWorkingRef = useRef(isAgentWorking);
  const handleGitIndexChange = useEffectEvent(() => {
    void refetchReviewGitChanges(scope);
    void refetchReviewGitIndexInfo(scope);
  });

  useEffect(
    () => startReviewGitChangesRefetch(scope),
    [scope, shouldFetchBranchChanges, shouldFetchStagedAndUnstagedChanges],
  );
  useEffect(
    () => startReviewGitIndexRefresh(scope),
    [scope, shouldFetchStagedAndUnstagedChanges],
  );

  useEffect(() => {
    setReviewLastTurnDiff(scope, lastTurnDiff);
  }, [lastTurnDiff, scope]);

  useEffect(() => {
    setReviewConversationTurns(scope, conversationTurns);
  }, [conversationTurns, scope]);

  useEffect(() => {
    if (!shouldResetOptimisticDiffs) {
      return;
    }

    resetReviewOptimisticDiffs(scope);
  }, [scope, shouldResetOptimisticDiffs]);

  useEffect(() => {
    const wasAgentWorking = previousIsAgentWorkingRef.current;
    previousIsAgentWorkingRef.current = isAgentWorking;

    if (!wasAgentWorking || isAgentWorking) {
      return;
    }

    handleGitIndexChange();
  }, [isAgentWorking]);

  useEffect(() => {
    if (appServerManager == null) {
      return;
    }

    appServerManager.setReviewPaneSnapshotMetrics({
      reviewDiffFilesTotal: snapshotMetrics.fileCount,
      reviewDiffLinesTotal: snapshotMetrics.lineCount,
      reviewDiffBytesEstimate: snapshotMetrics.bytesEstimate,
    });
  }, [appServerManager, snapshotMetrics]);

  useEffect(() => {
    if (appServerManager == null) {
      return;
    }

    return (): void => {
      appServerManager.setReviewPaneSnapshotMetrics({
        reviewDiffFilesTotal: 0,
        reviewDiffLinesTotal: 0,
        reviewDiffBytesEstimate: 0,
      });
    };
  }, [appServerManager]);

  useEffect(() => {
    if (!shouldFetchStagedAndUnstagedChanges) {
      return;
    }
    return addCheckGitIndexForChangesListener(handleGitIndexChange);
  }, [shouldFetchStagedAndUnstagedChanges]);

  return null;
}

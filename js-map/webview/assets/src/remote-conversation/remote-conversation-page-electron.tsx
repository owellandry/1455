import type { UseQueryResult } from "@tanstack/react-query";
import { useScope, useSignal } from "maitai";
import type {
  CodeTaskDetailsResponse,
  CodeTaskTurnsResponse,
  TaskAssistantTurn,
  ThreadDetailLevel,
} from "protocol";
import { useCallback, useState } from "react";

import { useSplitViewLayoutMode } from "@/components/split-view-layout";
import { Composer } from "@/composer/composer";
import { ReviewModeComposerOverlay } from "@/review/review-mode-composer-overlay";
import { reviewLayoutMode$ } from "@/review/review-preferences-model";
import { AppScope } from "@/scopes/app-scope";
import { THREAD_DETAIL_LEVEL_STEPS_PROSE } from "@/settings/thread-detail-level";
import { useElectronDiffShortcut } from "@/terminal/use-terminal-shortcut";
import { ThreadPageLayout } from "@/thread-layout/thread-page-layout";

import { RemoteConversationHeaderElectron } from "./remote-conversation-header-electron";
import { RemoteConversationReview } from "./remote-conversation-review";
import { RemoteConversationThread } from "./remote-conversation-thread";
import type { RemoteConversationTurn } from "./turn-tree";
import { useHasAppliedTurnLocally } from "./use-has-applied-code-locally";
import { useUnifiedDiff } from "./use-unified-diff";

export function RemoteConversationPageElectron({
  taskId,
  taskDetailsQuery,
  taskTurnsQuery,
  turns,
  selectedTurnId,
  setSelectedTurnId,
  selectedTurn,
  threadDetailLevel,
}: {
  taskId: string;
  taskDetailsQuery: UseQueryResult<CodeTaskDetailsResponse, Error>;
  taskTurnsQuery: UseQueryResult<CodeTaskTurnsResponse, Error>;
  turns: Array<RemoteConversationTurn>;
  selectedTurnId: string | null;
  setSelectedTurnId: (id: string | null) => void;
  selectedTurn: TaskAssistantTurn | null;
  threadDetailLevel: ThreadDetailLevel;
}): React.ReactElement {
  const scope = useScope(AppScope);
  const lastTurnDiff = useUnifiedDiff(taskDetailsQuery, selectedTurn);
  const currentTurnStatus =
    taskDetailsQuery.data?.current_assistant_turn?.turn_status;
  const isAgentWorking =
    currentTurnStatus === "in_progress" || currentTurnStatus === "pending";
  const hasDiff =
    !!taskDetailsQuery.data?.task.task_status_display
      ?.latest_turn_status_display?.diff_stats;
  const canShowDiffPanel =
    threadDetailLevel !== THREAD_DETAIL_LEVEL_STEPS_PROSE;
  const reviewLayoutMode = useSignal(reviewLayoutMode$);
  const {
    handleLeftPanelOpenChange,
    isLeftPanelOpen,
    isRightPanelOpen: isReviewOpen,
    setRightPanelOpen: setReviewPanelOpen,
    showInlineComposer,
  } = useSplitViewLayoutMode({
    layoutMode: reviewLayoutMode,
    setLayoutMode: (nextMode) => scope.set(reviewLayoutMode$, nextMode),
  });
  const showDiffPanel = canShowDiffPanel && hasDiff;
  const [expandedActionsPortalTarget, setExpandedActionsPortalTarget] =
    useState<HTMLDivElement | null>(null);
  const handleDiffShortcut = useCallback(
    (open?: boolean): void => {
      if (!canShowDiffPanel) {
        return;
      }
      if (!hasDiff && !isReviewOpen) {
        return;
      }
      setReviewPanelOpen(open ?? !isReviewOpen);
    },
    [canShowDiffPanel, hasDiff, isReviewOpen, setReviewPanelOpen],
  );
  const shouldShowOverlayComposer =
    hasDiff &&
    !showInlineComposer &&
    taskDetailsQuery.data != null &&
    selectedTurnId != null &&
    taskDetailsQuery.data.current_assistant_turn?.turn_status === "completed";
  useElectronDiffShortcut(handleDiffShortcut);

  return (
    <div className="flex h-full flex-col">
      <RemoteConversationHeaderElectron
        taskDetailsQuery={taskDetailsQuery}
        isDiffPanelOpen={isReviewOpen}
        onToggleDiffPanel={() => setReviewPanelOpen(!isReviewOpen)}
        hasDiffPanel={hasDiff}
        turns={turns}
        selectedTurn={selectedTurn}
      />
      <div className="relative min-h-0 flex-1">
        <ThreadPageLayout
          key={taskId}
          leftPanel={
            <RemoteConversationThread
              taskDetailsQuery={taskDetailsQuery}
              taskTurnsQuery={taskTurnsQuery}
              turns={turns}
              selectedTurnId={selectedTurnId}
              setSelectedTurnId={setSelectedTurnId}
              selectedTurn={selectedTurn}
              showComposer={showInlineComposer}
            />
          }
          rightPanel={
            showDiffPanel ? (
              <div
                ref={setExpandedActionsPortalTarget}
                className="relative h-full min-h-0"
              >
                <RemoteConversationReview
                  expandedActionsPortalTarget={expandedActionsPortalTarget}
                  isAgentWorking={isAgentWorking}
                  lastTurnDiff={lastTurnDiff}
                />
              </div>
            ) : null
          }
          isLeftPanelOpen={isLeftPanelOpen}
          setIsLeftPanelOpen={handleLeftPanelOpenChange}
          isRightPanelOpen={showDiffPanel ? isReviewOpen : false}
          setIsRightPanelOpen={
            showDiffPanel ? setReviewPanelOpen : (): void => undefined
          }
        />
        {shouldShowOverlayComposer ? (
          <RemoteConversationReviewComposerOverlay
            taskDetails={taskDetailsQuery.data}
            selectedTurnId={selectedTurnId}
            selectedTurn={selectedTurn}
            portalTarget={expandedActionsPortalTarget}
          />
        ) : null}
      </div>
    </div>
  );
}

function RemoteConversationReviewComposerOverlay({
  taskDetails,
  selectedTurnId,
  selectedTurn,
  portalTarget,
}: {
  taskDetails: CodeTaskDetailsResponse;
  selectedTurnId: string;
  selectedTurn: TaskAssistantTurn | null;
  portalTarget: HTMLElement | null;
}): React.ReactElement {
  const [hasAppliedCodeLocally] = useHasAppliedTurnLocally(selectedTurnId);

  return (
    <ReviewModeComposerOverlay portalTarget={portalTarget}>
      <Composer
        followUp={{
          type: "cloud",
          taskDetails,
          selectedTurnId,
          selectedTurn: selectedTurn ?? undefined,
          hasAppliedCodeLocally,
        }}
        footerBranchName={
          taskDetails.task.task_status_display?.branch_name ?? null
        }
        showFooterBranchWhen="always"
        surfaceClassName="electron:dark:bg-token-side-bar-background"
      />
    </ReviewModeComposerOverlay>
  );
}

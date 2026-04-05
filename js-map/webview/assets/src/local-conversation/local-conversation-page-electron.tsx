import { useAtom } from "jotai";
import { useScope, useSignal } from "maitai";
import { createGitCwd, type ConversationId } from "protocol";
import { useCallback, useEffect, useState } from "react";

import {
  useAppServerManagerForConversationId,
  useLocalConversationCwd,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import { useSplitViewLayoutMode } from "@/components/split-view-layout";
import { WithWindow } from "@/components/with-window";
import { Composer } from "@/composer/composer";
import { focusComposerInput } from "@/composer/focus-composer";
import { ReasoningEffortLabelMessage } from "@/composer/model-and-reasoning-effort-translations";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitHeadChangeRefetch } from "@/git-rpc/use-git-head-change-refetch";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { ReviewModeComposerOverlay } from "@/review/review-mode-composer-overlay";
import { reviewLayoutMode$ } from "@/review/review-preferences-model";
import { AppScope } from "@/scopes/app-scope";
import { useHostConfig } from "@/shared-objects/use-host-config";
import {
  aTerminalOpenByKey,
  getTerminalOpenByKey,
  setTerminalOpenByKey,
} from "@/terminal/terminal-atoms";
import { TerminalPanel } from "@/terminal/terminal-panel";
import { useTerminalSessionId } from "@/terminal/use-terminal-session";
import {
  useElectronDiffShortcut,
  useElectronTerminalShortcut,
} from "@/terminal/use-terminal-shortcut";
import { ThreadPageLayout } from "@/thread-layout/thread-page-layout";
import { ThreadSidePanel } from "@/thread-layout/thread-side-panel";
import { formatModelDisplayName } from "@/utils/format-model-display-name";

import { getLocalConversationTitle } from "./get-local-conversation-title";
import { getSubagentHeaderAgentName } from "./get-subagent-header-agent-name";
import { getAgentMentionColorCssValueForSessionId } from "./items/multi-agent-mentions";
import {
  LocalConversationActions,
  LocalConversationHeaderElectron,
} from "./local-conversation-header-electron";
import { LocalConversationThread } from "./local-conversation-thread";

export function LocalConversationPageElectron({
  conversationId,
}: {
  conversationId: ConversationId;
}): React.ReactElement {
  const scope = useScope(AppScope);
  const terminalKey = conversationId;
  const [terminalOpenByKey, setTerminalOpenByKeyAtom] =
    useAtom(aTerminalOpenByKey);
  const isTerminalOpen = getTerminalOpenByKey(terminalOpenByKey, terminalKey);
  const [animateTerminalPanel, setAnimateTerminalPanel] = useState(false);
  const [expandedActionsPortalTarget, setExpandedActionsPortalTarget] =
    useState<HTMLDivElement | null>(null);
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

  useEffect((): void => {
    setAnimateTerminalPanel(false);
  }, [conversationId]);

  const setTerminalOpen = (next: boolean): void => {
    setAnimateTerminalPanel(true);
    setTerminalOpenByKeyAtom(
      setTerminalOpenByKey(terminalOpenByKey, terminalKey, next),
    );
  };

  const handleToggleTerminal = (): void => {
    const next = !isTerminalOpen;
    setTerminalOpen(next);
    if (!next) {
      focusComposerInput();
    }
  };

  useElectronTerminalShortcut(handleToggleTerminal);
  const handleToggleReviewPanel = (): void => {
    setReviewPanelOpen(!isReviewOpen);
  };
  const handleDiffShortcut = useCallback(
    (open?: boolean): void => {
      if (open == null) {
        setReviewPanelOpen(!isReviewOpen);
        return;
      }
      setReviewPanelOpen(open);
    },
    [isReviewOpen, setReviewPanelOpen],
  );
  useElectronDiffShortcut(handleDiffShortcut);

  return (
    <div className="flex h-full flex-col">
      <LocalConversationHeaderSection
        conversationId={conversationId}
        onToggleTerminal={handleToggleTerminal}
        isTerminalOpen={isTerminalOpen}
        isDiffPanelOpen={isReviewOpen}
        onToggleReviewPanel={handleToggleReviewPanel}
        onShowTerminal={(): void => {
          setTerminalOpen(true);
        }}
      />
      <div className="relative min-h-0 flex-1">
        <ThreadPageLayout
          key={conversationId}
          leftPanel={
            <LocalConversationThreadPanel
              conversationId={conversationId}
              disableComposerAutoFocus={isTerminalOpen}
              showComposer={showInlineComposer}
            />
          }
          rightPanel={
            <ThreadSidePanel
              conversationId={conversationId}
              ref={setExpandedActionsPortalTarget}
            />
          }
          bottomPanel={
            <LocalConversationTerminalPanel
              conversationId={conversationId}
              isActive={isTerminalOpen}
              onClose={handleToggleTerminal}
            />
          }
          isBottomPanelOpen={isTerminalOpen}
          animateBottomPanel={animateTerminalPanel}
          setIsBottomPanelOpen={(isOpen): void => {
            setTerminalOpen(isOpen);
          }}
          isLeftPanelOpen={isLeftPanelOpen}
          setIsLeftPanelOpen={handleLeftPanelOpenChange}
          isRightPanelOpen={isReviewOpen}
          setIsRightPanelOpen={setReviewPanelOpen}
        />
        {!showInlineComposer ? (
          <LocalConversationReviewComposerOverlay
            conversationId={conversationId}
            disableComposerAutoFocus={isTerminalOpen}
            portalTarget={expandedActionsPortalTarget}
          />
        ) : null}
      </div>
    </div>
  );
}

function LocalConversationHeaderSection({
  conversationId,
  onToggleTerminal,
  isTerminalOpen,
  isDiffPanelOpen,
  onToggleReviewPanel,
  onShowTerminal,
}: {
  conversationId: ConversationId;
  onToggleTerminal: () => void;
  isTerminalOpen: boolean;
  isDiffPanelOpen: boolean;
  onToggleReviewPanel: () => void;
  onShowTerminal: () => void;
}): React.ReactElement {
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const hasConversation = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation != null,
  );
  const title = useLocalConversationSelector(
    conversationId,
    getLocalConversationTitle,
  );
  const latestModel = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.latestModel ?? null,
  );
  const latestReasoningEffort = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.latestReasoningEffort ?? null,
  );
  const source = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.source ?? null,
  );
  const subagentSourceMetadata = getSubagentSourceMetadata(source);
  const canPin = subagentSourceMetadata?.parentThreadId == null;
  const visibleSubagentSourceMetadata = isBackgroundSubagentsEnabled
    ? subagentSourceMetadata
    : null;
  const subagentParentThreadId =
    visibleSubagentSourceMetadata?.parentThreadId ?? null;
  const titleSuffix =
    subagentParentThreadId != null ? (
      <span
        className="ml-1 shrink-0 font-medium"
        style={{
          color: getAgentMentionColorCssValueForSessionId(conversationId),
        }}
      >
        {getSubagentHeaderAgentName({
          agentNickname: visibleSubagentSourceMetadata?.agentNickname ?? null,
          conversationId,
        })}
      </span>
    ) : null;
  const titleSuffixRoleLabel =
    visibleSubagentSourceMetadata?.agentRole == null
      ? null
      : visibleSubagentSourceMetadata.agentRole === "default"
        ? null
        : `(${visibleSubagentSourceMetadata.agentRole})`;
  const titleSuffixRole =
    titleSuffixRoleLabel == null ? null : (
      <span className="ml-1 shrink-0 text-token-description-foreground">
        {titleSuffixRoleLabel}
      </span>
    );
  const titleSuffixModel =
    subagentParentThreadId == null || latestModel == null ? null : (
      <span className="ml-1 shrink-0 text-token-description-foreground">
        {formatModelDisplayName(latestModel)}
        {latestReasoningEffort == null ? null : (
          <>
            {" ("}
            <ReasoningEffortLabelMessage effort={latestReasoningEffort} />
            {")"}
          </>
        )}
      </span>
    );
  const cwd = useLocalConversationCwd(conversationId);
  return (
    <LocalConversationHeaderElectron
      conversationId={hasConversation ? conversationId : null}
      title={title}
      titleSuffix={
        titleSuffix == null &&
        titleSuffixRole == null &&
        titleSuffixModel == null ? null : (
          <>
            {titleSuffix}
            {titleSuffixRole}
            {titleSuffixModel}
          </>
        )
      }
      cwd={cwd}
      canPin={canPin}
      onToggleTerminal={onToggleTerminal}
      isTerminalOpen={isTerminalOpen}
      isDiffPanelOpen={isDiffPanelOpen}
      onToggleReviewPanel={onToggleReviewPanel}
      trailing={
        hasConversation ? (
          <LocalConversationActions
            conversationId={conversationId}
            cwd={cwd}
            onShowTerminal={onShowTerminal}
          />
        ) : null
      }
    />
  );
}

// Keep these as leaf components so subscription-heavy hooks stay out of the
// ThreadPageLayout owner and streaming deltas do not invalidate the full layout.
function LocalConversationThreadPanel({
  conversationId,
  disableComposerAutoFocus,
  showComposer,
}: {
  conversationId: ConversationId;
  disableComposerAutoFocus: boolean;
  showComposer: boolean;
}): React.ReactElement {
  return (
    <LocalConversationThread
      disableComposerAutoFocus={disableComposerAutoFocus}
      conversationId={conversationId}
      showComposer={showComposer}
    />
  );
}

function LocalConversationReviewComposerOverlay({
  conversationId,
  disableComposerAutoFocus,
  portalTarget,
}: {
  conversationId: ConversationId;
  disableComposerAutoFocus: boolean;
  portalTarget: HTMLElement | null;
}): React.ReactElement | null {
  const appServerManager = useAppServerManagerForConversationId(conversationId);
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const conversationCwd = useLocalConversationCwd(conversationId);
  const gitCwd = conversationCwd ? createGitCwd(conversationCwd) : null;
  const { data: currentBranch, refetch: refetchCurrentBranch } =
    useGitCurrentBranch(gitCwd, hostConfig);
  useGitHeadChangeRefetch(gitCwd, hostConfig, refetchCurrentBranch);
  const conversationGitBranch = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.gitInfo?.branch ?? null,
  );
  const isInProgress = useLocalConversationSelector(
    conversationId,
    (conversation) => {
      return (
        (conversation?.turns.length ?? 0) > 0 &&
        conversation?.turns[conversation.turns.length - 1]?.status ===
          "inProgress"
      );
    },
  );
  const hasConversation = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation != null,
  );
  if (!hasConversation) {
    return null;
  }

  return (
    <ReviewModeComposerOverlay portalTarget={portalTarget}>
      <Composer
        followUp={{ type: "local", localConversationId: conversationId }}
        disableAutoFocus={disableComposerAutoFocus}
        isResponseInProgress={isInProgress}
        footerBranchName={currentBranch ?? conversationGitBranch}
        threadBranchName={conversationGitBranch}
        showFooterBranchWhen="always"
        surfaceClassName="electron:dark:bg-token-side-bar-background"
      />
    </ReviewModeComposerOverlay>
  );
}

function LocalConversationTerminalPanel({
  conversationId,
  isActive,
  onClose,
}: {
  conversationId: ConversationId;
  isActive: boolean;
  onClose: () => void;
}): React.ReactElement {
  const conversationHostId = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.hostId ?? null,
  );
  const conversationCwd = useLocalConversationCwd(conversationId);
  const gitCwd = conversationCwd ? createGitCwd(conversationCwd) : null;
  const terminalSessionId = useTerminalSessionId({
    conversationId,
    hostId: conversationHostId,
    cwd: gitCwd,
  });
  return (
    <WithWindow electron>
      <TerminalPanel
        key={terminalSessionId ?? conversationId}
        conversationId={conversationId}
        hostId={conversationHostId}
        cwd={gitCwd}
        isActive={isActive}
        sessionId={terminalSessionId}
        onClose={onClose}
      />
    </WithWindow>
  );
}

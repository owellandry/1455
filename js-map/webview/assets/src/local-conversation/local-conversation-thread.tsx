import { atom, useAtom, useAtomValue } from "jotai";
import { useScope, useSignal } from "maitai";
import {
  buildHotkeyWindowThreadRoute,
  buildLocalConversationRoute,
  createConversationId,
  createGitCwd,
  getHotkeyWindowNewConversationRoute,
  type ConversationId,
} from "protocol";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { Navigate, useNavigate } from "react-router";

import {
  useAppServerManagerForConversationIdOrDefault,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";
import type { ConversationRequest } from "@/app-server/conversation-request";
import { editLastUserTurn } from "@/app-server/requests/edit-last-user-turn";
import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import { isLocalConversationInProgress } from "@/app-server/utils/is-local-conversation-in-progress";
import { DeferInitialRender } from "@/components/defer-initial-render";
import { ErrorBoundary } from "@/components/error-boundary";
import { AnimatedScrollToBottomButton } from "@/components/scroll-to-bottom-buton";
import { toast$ } from "@/components/toaster/toast-signal";
import { UserMessage } from "@/components/user-message";
import { WithWindow } from "@/components/with-window";
import { Composer } from "@/composer/composer";
import { aAgentMode } from "@/composer/composer-atoms";
import { waitForLayout } from "@/content-search/scroll-to-match";
import { ContentSearchControllerBridge } from "@/content-search/search-controller-bridge";
import {
  contentSearchDiffSource$,
  setContentSearchDefaultDomainForOpen,
} from "@/content-search/search-model";
import type { ConversationScrollAdapter } from "@/content-search/types";
import { useConversationSearchHighlights } from "@/content-search/use-conversation-search-highlights";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitHeadChangeRefetch } from "@/git-rpc/use-git-head-change-refetch";
import { Header } from "@/header/header";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { useWindowType } from "@/hooks/use-window-type";
import { isHotkeyWindowContextFromWindow } from "@/hotkey-window/is-hotkey-window-context";
import { useInboxItems } from "@/inbox/use-inbox-items";
import { LoadingPage } from "@/loading-page/loading-page";
import { AppScope } from "@/scopes/app-scope";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { ThreadLayout } from "@/thread-layout/thread-layout";
import { useThreadScrollController } from "@/thread-layout/thread-scroll-controller-context-value";
import {
  ThreadScrollLayout,
  type ThreadScrollLayoutRef,
} from "@/thread-layout/thread-scroll-layout";
import { logger } from "@/utils/logger";
import { useFocusVsContext } from "@/utils/use-vs-context";
import { useFetchFromVSCode } from "@/vscode-api";
import { WorktreeRestoreBanner } from "@/worktrees/worktree-restore-banner";

import { ForkFromOlderTurnDialog } from "./fork-from-older-turn-dialog";
import { shouldSkipForkFromOlderTurnConfirm } from "./fork-from-older-turn-dialog-state";
import { getForkedSubagentVisibleTurns } from "./forked-subagent-visible-turns";
import { getLocalConversationTitle } from "./get-local-conversation-title";
import { hasRenderableLocalConversationTurn } from "./items/map-mcp-conversation-turn";
import {
  createLocalConversationSearchSource,
  getLocalTurnSearchKey,
} from "./local-conversation-search-source";
import { LocalConversationTurn } from "./local-conversation-turn";
import { threadActionMessages } from "./thread-actions";
import {
  setCollapsedTurnStateByConversation,
  shouldSuppressAutoStickToBottomOnExpand,
} from "./turn-collapse";
import { useResumeConversationIfNeeded } from "./use-resume-conversation-if-needed";
import {
  VirtualizedTurnList,
  type VirtualizedTurnListApi,
} from "./virtualized-turn-list";

const EMPTY_REQUESTS: Array<ConversationRequest> = [];
const EMPTY_TURNS: Array<AppServerConversationTurn> = [];
const aLocalFollowUpByConversationId = atom<
  Record<
    ConversationId,
    {
      type: "local";
      localConversationId: ConversationId;
    }
  >
>({});
const aCollapsedTurnsByConversationId = atom<
  Record<ConversationId, Record<string, boolean>>
>({});

function buildThreadRouteForCurrentWindow(
  conversationId: ConversationId,
): string {
  return isHotkeyWindowContextFromWindow()
    ? buildHotkeyWindowThreadRoute(conversationId)
    : buildLocalConversationRoute(conversationId);
}

function useLocalFollowUp(conversationId: ConversationId): {
  type: "local";
  localConversationId: ConversationId;
} {
  const [followUpByConversationId, setFollowUpByConversationId] = useAtom(
    aLocalFollowUpByConversationId,
  );
  const followUp = followUpByConversationId[conversationId];

  useEffect(() => {
    if (followUp != null) {
      return;
    }
    setFollowUpByConversationId((prev) => {
      if (prev[conversationId] != null) {
        return prev;
      }
      return {
        ...prev,
        [conversationId]: {
          type: "local",
          localConversationId: conversationId,
        },
      };
    });
  }, [conversationId, followUp, setFollowUpByConversationId]);

  if (followUp != null) {
    return followUp;
  }

  return {
    type: "local",
    localConversationId: conversationId,
  };
}

export function LocalConversationThread({
  className,
  disableComposerAutoFocus,
  conversationId,
  shouldResume = true,
  allowMissingConversation = false,
  header,
  showExternalFooter = true,
  composerSurfaceClassName,
  showComposer = true,
}: {
  className?: string;
  disableComposerAutoFocus?: boolean;
  conversationId: ConversationId | null;
  shouldResume?: boolean;
  allowMissingConversation?: boolean;
  header?: React.ReactNode;
  showExternalFooter?: boolean;
  composerSurfaceClassName?: string;
  showComposer?: boolean;
}): React.ReactElement {
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const windowType = useWindowType();
  const { data: hotkeyWindowState } = useFetchFromVSCode(
    "hotkey-window-hotkey-state",
    {
      queryConfig: {
        enabled: windowType === "electron" && isHotkeyWindowContextFromWindow(),
      },
    },
  );
  const shouldUseHotkeyHomeRoute =
    hotkeyWindowState == null || hotkeyWindowState.configuredHotkey != null;
  const hotkeyWindowHomeRoute = getHotkeyWindowNewConversationRoute(
    shouldUseHotkeyHomeRoute,
  );
  const hasConversation = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation != null,
  );
  const { isResuming } = useResumeConversationIfNeeded(
    shouldResume ? (conversationId ?? null) : null,
  );
  const subagentParentThreadId = useLocalConversationSelector(
    conversationId,
    (conversation) =>
      !isBackgroundSubagentsEnabled || conversation == null
        ? null
        : (getSubagentSourceMetadata(conversation.source)?.parentThreadId ??
          null),
  );

  const scope = useScope(AppScope);
  const intl = useIntl();
  const navigate = useNavigate();
  const hasLoadedConversationRef = useRef(false);
  const lastKnownSubagentParentThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (subagentParentThreadId == null) {
      return;
    }
    lastKnownSubagentParentThreadIdRef.current = subagentParentThreadId;
  }, [subagentParentThreadId]);

  useEffect(() => {
    if (allowMissingConversation) {
      return;
    }
    if (hasConversation) {
      hasLoadedConversationRef.current = true;
      return;
    }
    if (isResuming) {
      return;
    }
    if (hasLoadedConversationRef.current) {
      const parentThreadId = lastKnownSubagentParentThreadIdRef.current;
      if (parentThreadId != null) {
        void navigate(
          buildThreadRouteForCurrentWindow(
            createConversationId(parentThreadId),
          ),
          {
            replace: true,
          },
        );
        return;
      }
      void navigate(
        isHotkeyWindowContextFromWindow() ? hotkeyWindowHomeRoute : "/",
        {
          replace: true,
        },
      );
      return;
    }
    scope.get(toast$).danger(
      intl.formatMessage({
        id: "localConversationPage.error.toast",
        defaultMessage: "Conversation not found",
        description:
          "Error message for when the local conversation is not found",
      }),
    );
  }, [
    allowMissingConversation,
    hasConversation,
    isResuming,
    subagentParentThreadId,
    hotkeyWindowHomeRoute,
    scope,
    intl,
    navigate,
  ]);

  if (!conversationId) {
    return <Navigate to="/" />;
  }

  return (
    <LocalConversationThreadContent
      className={className}
      disableComposerAutoFocus={disableComposerAutoFocus}
      conversationId={conversationId}
      hasConversation={hasConversation}
      isResuming={isResuming}
      header={header}
      showExternalFooter={showExternalFooter}
      composerSurfaceClassName={composerSurfaceClassName}
      showComposer={showComposer}
      isBackgroundSubagentsEnabled={isBackgroundSubagentsEnabled}
    />
  );
}

function LocalConversationThreadContent({
  className,
  disableComposerAutoFocus,
  conversationId,
  hasConversation,
  isResuming,
  header,
  showExternalFooter,
  composerSurfaceClassName,
  showComposer,
  isBackgroundSubagentsEnabled,
}: {
  className?: string;
  disableComposerAutoFocus?: boolean;
  conversationId: ConversationId;
  hasConversation: boolean;
  isResuming: boolean;
  header?: React.ReactNode;
  showExternalFooter: boolean;
  composerSurfaceClassName: string | undefined;
  showComposer: boolean;
  isBackgroundSubagentsEnabled: boolean;
}): React.ReactElement {
  return (
    <LocalConversationThreadContentBody
      className={className}
      disableComposerAutoFocus={disableComposerAutoFocus}
      conversationId={conversationId}
      hasConversation={hasConversation}
      isResuming={isResuming}
      header={header}
      showExternalFooter={showExternalFooter}
      composerSurfaceClassName={composerSurfaceClassName}
      showComposer={showComposer}
      isBackgroundSubagentsEnabled={isBackgroundSubagentsEnabled}
    />
  );
}

function LocalConversationThreadContentBody({
  className,
  disableComposerAutoFocus,
  conversationId,
  hasConversation,
  isResuming,
  header,
  showExternalFooter,
  composerSurfaceClassName,
  showComposer,
  isBackgroundSubagentsEnabled,
}: {
  className?: string;
  disableComposerAutoFocus?: boolean;
  conversationId: ConversationId;
  hasConversation: boolean;
  isResuming: boolean;
  header?: React.ReactNode;
  showExternalFooter: boolean;
  composerSurfaceClassName: string | undefined;
  showComposer: boolean;
  isBackgroundSubagentsEnabled: boolean;
}): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolledFromBottom, setIsScrolledFromBottom] = useState(false);
  const mcpManager = useAppServerManagerForConversationIdOrDefault(
    hasConversation ? conversationId : null,
  );
  const hasUnreadTurn = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.hasUnreadTurn ?? false,
  );
  const title = useLocalConversationSelector(
    conversationId,
    getLocalConversationTitle,
  );
  const vsContextRef = useFocusVsContext<HTMLDivElement>(
    "chatgpt.supportsNewChatKeyShortcut",
  );
  useEffect(() => {
    if (!hasUnreadTurn) {
      return;
    }
    mcpManager.markConversationAsRead(conversationId);
  }, [conversationId, hasUnreadTurn, mcpManager]);

  const threadScrollLayoutRef = useRef<ThreadScrollLayoutRef | null>(null);
  return (
    <ErrorBoundary name="LocalConversationPage">
      <ThreadLayout
        className={className}
        bodyClassName="[&_[data-thread-find-target=conversation]]:scroll-mt-24"
        containerRef={vsContextRef}
        data-vscode-context='{"chatgpt.supportsNewChatMenu": true}'
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        header={
          header ?? (
            <WithWindow extension>
              <Header title={title} />
            </WithWindow>
          )
        }
        aboveFooter={
          <WithWindow electron>
            {hasConversation ? (
              <LocalConversationThreadWorktreeRestoreBanner
                conversationId={conversationId}
              />
            ) : null}
          </WithWindow>
        }
        footer={
          hasConversation && showComposer ? (
            <LocalConversationThreadFooter
              conversationId={conversationId}
              disableComposerAutoFocus={disableComposerAutoFocus}
              showExternalFooter={showExternalFooter}
              composerSurfaceClassName={composerSurfaceClassName}
              showScrollToBottomButton={isScrolledFromBottom}
              onScrollToBottom={() =>
                threadScrollLayoutRef.current?.scrollToBottom()
              }
              isBackgroundSubagentsEnabled={isBackgroundSubagentsEnabled}
            />
          ) : null
        }
      >
        <ThreadScrollLayout
          ref={threadScrollLayoutRef}
          scrollViewClassName={!isHovered ? "hide-scrollbar" : undefined}
          onScroll={(isNearBottom) => setIsScrolledFromBottom(!isNearBottom)}
        >
          <LocalConversationThreadTurns
            conversationId={conversationId}
            isResuming={isResuming}
            isBackgroundSubagentsEnabled={isBackgroundSubagentsEnabled}
          />
        </ThreadScrollLayout>
      </ThreadLayout>
    </ErrorBoundary>
  );
}

function LocalConversationThreadWorktreeRestoreBanner({
  conversationId,
}: {
  conversationId: ConversationId;
}): React.ReactElement | null {
  const conversationCwd = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.cwd ?? null,
  );

  return (
    <WorktreeRestoreBanner
      conversationId={conversationId}
      cwd={conversationCwd}
    />
  );
}

function LocalConversationThreadFooter({
  conversationId,
  disableComposerAutoFocus,
  showExternalFooter,
  composerSurfaceClassName,
  showScrollToBottomButton,
  onScrollToBottom,
  isBackgroundSubagentsEnabled,
}: {
  conversationId: ConversationId;
  disableComposerAutoFocus: boolean | undefined;
  showExternalFooter: boolean;
  composerSurfaceClassName: string | undefined;
  showScrollToBottomButton: boolean;
  onScrollToBottom: () => void;
  isBackgroundSubagentsEnabled: boolean;
}): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const mcpManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const conversationSource = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.source ?? null,
  );
  const subagentParentThreadId =
    isBackgroundSubagentsEnabled && conversationSource != null
      ? (getSubagentSourceMetadata(conversationSource)?.parentThreadId ?? null)
      : null;
  const subagentParentConversationId =
    subagentParentThreadId != null
      ? createConversationId(subagentParentThreadId)
      : null;
  const conversationTurns = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.turns ?? EMPTY_TURNS,
  );
  const conversationResumeState = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.resumeState ?? "needs_resume",
  );
  const parentConversationTurns = useLocalConversationSelector(
    subagentParentConversationId,
    (conversation) => conversation?.turns ?? EMPTY_TURNS,
  );
  const localFollowUp = useLocalFollowUp(conversationId);
  const conversationCwd = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.cwd ?? null,
  );
  const conversationGitBranch = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.gitInfo?.branch ?? null,
  );
  const visibleTurns =
    conversationSource != null && subagentParentConversationId != null
      ? getForkedSubagentVisibleTurns({
          conversation: {
            resumeState: conversationResumeState,
            turns: conversationTurns,
          },
          parentConversation: { turns: parentConversationTurns },
        })
      : conversationTurns;
  const isInProgress = visibleTurns.at(-1)?.status === "inProgress";
  const gitCwd = conversationCwd ? createGitCwd(conversationCwd) : null;
  const hostConfig = useHostConfig(mcpManager.getHostId());
  const { data: currentBranch, refetch: refetchCurrentBranch } =
    useGitCurrentBranch(gitCwd, hostConfig);
  const intl = useIntl();

  useGitHeadChangeRefetch(gitCwd, hostConfig, refetchCurrentBranch);

  return (
    <div
      className="contents"
      data-thread-find-composer="true"
      onMouseDownCapture={() => {
        setContentSearchDefaultDomainForOpen(scope, "conversation");
      }}
      onFocusCapture={() => {
        setContentSearchDefaultDomainForOpen(scope, "conversation");
      }}
    >
      <div className="relative h-0">
        <AnimatedScrollToBottomButton
          className="bottom-[calc(100%+6*var(--spacing))]"
          label={intl.formatMessage({
            id: "localConversation.scrollToBottomButton",
            defaultMessage: "Scroll to bottom",
            description: "Label for button that scrolls to the latest message",
          })}
          onClick={onScrollToBottom}
          show={showScrollToBottomButton}
        />
      </div>
      <Composer
        followUp={localFollowUp}
        disableAutoFocus={disableComposerAutoFocus}
        isResponseInProgress={isInProgress}
        footerBranchName={currentBranch ?? conversationGitBranch}
        threadBranchName={conversationGitBranch}
        showFooterBranchWhen="always"
        showExternalFooter={showExternalFooter}
        surfaceClassName={composerSurfaceClassName}
      />
    </div>
  );
}

function LocalConversationThreadTurns({
  conversationId,
  isResuming,
  isBackgroundSubagentsEnabled,
}: {
  conversationId: ConversationId;
  isResuming: boolean;
  isBackgroundSubagentsEnabled: boolean;
}): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const navigate = useNavigate();
  const hasConversation = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation != null,
  );
  const conversationSource = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.source ?? null,
  );
  const conversationTurns = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.turns ?? EMPTY_TURNS,
  );
  const conversationRequests = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.requests ?? EMPTY_REQUESTS,
  );
  const conversationCwd = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.cwd ?? null,
  );
  const conversationResumeState = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.resumeState ?? "needs_resume",
  );
  const conversationThreadRuntimeStatus = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.threadRuntimeStatus ?? null,
  );
  const conversationLatestCollaborationMode = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.latestCollaborationMode ?? null,
  );
  const appServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const subagentParentThreadId =
    isBackgroundSubagentsEnabled && conversationSource != null
      ? (getSubagentSourceMetadata(conversationSource)?.parentThreadId ?? null)
      : null;
  const subagentParentConversationId =
    subagentParentThreadId != null
      ? createConversationId(subagentParentThreadId)
      : null;
  const parentConversationTurns = useLocalConversationSelector(
    subagentParentConversationId,
    (conversation) => conversation?.turns ?? EMPTY_TURNS,
  );
  const [collapsedTurnsByConversationId, setCollapsedTurnsByConversationId] =
    useAtom(aCollapsedTurnsByConversationId);
  const threadScrollController = useThreadScrollController();
  const { scrollElement, suppressAutoStickToBottom } = threadScrollController;
  const windowType = useWindowType();
  const { data: automationsData } = useFetchFromVSCode("list-automations", {
    queryConfig: { enabled: windowType === "electron" },
  });
  const automations = automationsData?.items ?? [];
  const { items: inboxItems, markRead } = useInboxItems();
  const automationInboxItem = hasConversation
    ? (inboxItems.find((item) => item.threadId === conversationId) ?? null)
    : null;
  const automationPromptFromDefinition =
    automationInboxItem?.automationId != null
      ? (automations.find(
          (automation) => automation.id === automationInboxItem.automationId,
        )?.prompt ?? null)
      : null;
  const automationPrompt =
    automationPromptFromDefinition ?? automationInboxItem?.description ?? null;
  const hasAutomationPrompt =
    automationInboxItem?.automationId != null &&
    automationPrompt != null &&
    automationPrompt.trim().length > 0;

  useEffect(() => {
    if (automationInboxItem?.id == null || automationInboxItem.readAt != null) {
      return;
    }
    markRead(automationInboxItem.id);
  }, [automationInboxItem?.id, automationInboxItem?.readAt, markRead]);

  const intl = useIntl();
  const agentMode = useAtomValue(aAgentMode);
  const hasUserMessage = conversationTurns.some((turn) =>
    turn.items.some((item) => item.type === "userMessage"),
  );
  const shouldDeferThreadContent =
    !isResuming && hasConversation && conversationTurns.length >= 40;
  const gitCwd = conversationCwd ? createGitCwd(conversationCwd) : null;
  const collapsedTurnsById = useMemo(() => {
    return collapsedTurnsByConversationId[conversationId] ?? {};
  }, [collapsedTurnsByConversationId, conversationId]);
  const previousLatestTurnIdRef = useRef<string | null>(null);
  const previousConversationIdRef = useRef(conversationId);
  const [pendingOlderTurnFork, setPendingOlderTurnFork] = useState<{
    message: string;
    turnId: string;
  } | null>(null);
  const [isForkingTurnMessage, setIsForkingTurnMessage] = useState(false);
  const conversationSearchContainerRef = useRef<HTMLDivElement | null>(null);
  const virtualizedTurnListApiRef = useRef<VirtualizedTurnListApi | null>(null);
  if (previousConversationIdRef.current !== conversationId) {
    previousConversationIdRef.current = conversationId;
    previousLatestTurnIdRef.current = null;
  }
  const requestsByTurnId = useMemo(() => {
    const requestsByTurn = new Map<string, Array<ConversationRequest>>();

    for (const request of conversationRequests) {
      if (
        request.method !== "item/commandExecution/requestApproval" &&
        request.method !== "item/fileChange/requestApproval" &&
        request.method !== "item/tool/requestUserInput"
      ) {
        continue;
      }

      const turnId = request.params.turnId;
      const existingRequests = requestsByTurn.get(turnId);
      if (existingRequests != null) {
        existingRequests.push(request);
      } else {
        requestsByTurn.set(turnId, [request]);
      }
    }

    return requestsByTurn;
  }, [conversationRequests]);
  const visibleTurns = useMemo(() => {
    if (!hasConversation) {
      return [];
    }

    return conversationTurns.flatMap((turn, index) => {
      const turnId = turn.turnId;
      const turnRequests =
        turnId != null
          ? (requestsByTurnId.get(turnId) ?? EMPTY_REQUESTS)
          : EMPTY_REQUESTS;
      if (
        !hasRenderableLocalConversationTurn(turn, turnRequests, {
          isBackgroundSubagentsEnabled,
        })
      ) {
        return [];
      }
      return [
        {
          turn,
          turnId,
          turnSearchKey: getLocalTurnSearchKey(turnId, index),
          requests: turnRequests,
        },
      ];
    });
  }, [
    conversationTurns,
    hasConversation,
    isBackgroundSubagentsEnabled,
    requestsByTurnId,
  ]);
  const inheritedParentTurnIds = new Set<string>();
  if (
    subagentParentThreadId != null &&
    hasConversation &&
    parentConversationTurns.length > 0 &&
    conversationResumeState === "resumed"
  ) {
    const parentTurnIds = new Set<string>();
    for (const turn of parentConversationTurns) {
      if (turn.turnId != null) {
        parentTurnIds.add(turn.turnId);
      }
    }

    for (const turn of conversationTurns) {
      if (turn.turnId != null && parentTurnIds.has(turn.turnId)) {
        inheritedParentTurnIds.add(turn.turnId);
      }
    }
  }
  const childVisibleTurns = useMemo(() => {
    const visibleTurnIds = new Set(
      (hasConversation && subagentParentThreadId != null
        ? getForkedSubagentVisibleTurns({
            conversation: {
              resumeState: conversationResumeState,
              turns: conversationTurns,
            },
            parentConversation: {
              turns: parentConversationTurns,
            },
          })
        : conversationTurns
      ).flatMap((turn) => {
        return turn.turnId != null ? [turn.turnId] : [];
      }),
    );
    return visibleTurns.filter((visibleTurn) => {
      return (
        visibleTurn.turnId == null || visibleTurnIds.has(visibleTurn.turnId)
      );
    });
  }, [
    conversationResumeState,
    conversationTurns,
    hasConversation,
    parentConversationTurns,
    subagentParentThreadId,
    visibleTurns,
  ]);
  const canActOnUserMessages =
    hasConversation &&
    !isLocalConversationInProgress({
      resumeState: conversationResumeState,
      threadRuntimeStatus: conversationThreadRuntimeStatus,
      turns: conversationTurns,
    });

  const latestTurnId = childVisibleTurns.at(-1)?.turnId ?? null;
  const isSubagentThread = subagentParentThreadId != null;
  const hasRenderableTurns = childVisibleTurns.length > 0;

  const conversationScrollAdapter = useMemo((): ConversationScrollAdapter => {
    return {
      scrollToTurn: async (turnKey: string): Promise<void> => {
        if (collapsedTurnsById[turnKey] === true) {
          setCollapsedTurnsByConversationId((current) => {
            return setCollapsedTurnStateByConversation({
              current,
              conversationId,
              turnId: turnKey,
              collapsed: false,
            });
          });
        }

        await waitForLayout();

        const virtualizedTurnListApi = virtualizedTurnListApiRef.current;
        if (virtualizedTurnListApi == null) {
          throw new Error(
            "Local conversation search scroll requested before VirtualizedTurnList API was ready",
          );
        }
        await virtualizedTurnListApi.scrollToKey(turnKey);

        await waitForLayout();
      },
      getTurnContainer: (turnKey: string): HTMLElement | null => {
        const container = conversationSearchContainerRef.current;
        if (container == null) {
          return null;
        }
        const el = container.querySelector<HTMLElement>(
          `[data-content-search-turn-key="${turnKey}"]`,
        );
        return el ?? null;
      },
    };
  }, [collapsedTurnsById, conversationId, setCollapsedTurnsByConversationId]);

  const hasConversationRef = useRef(hasConversation);
  const conversationTurnsRef = useRef(conversationTurns);
  const isBackgroundSubagentsEnabledRef = useRef(isBackgroundSubagentsEnabled);
  hasConversationRef.current = hasConversation;
  conversationTurnsRef.current = conversationTurns;
  isBackgroundSubagentsEnabledRef.current = isBackgroundSubagentsEnabled;
  const conversationSearchSource = useMemo(() => {
    return createLocalConversationSearchSource({
      getConversationState: () =>
        hasConversationRef.current
          ? { turns: conversationTurnsRef.current }
          : null,
      getIsBackgroundSubagentsEnabled: () =>
        isBackgroundSubagentsEnabledRef.current,
      routeContextId:
        conversationId == null
          ? "unavailable"
          : `conversation:${conversationId}`,
      scrollAdapter: conversationScrollAdapter,
    });
  }, [conversationId, conversationScrollAdapter]);
  const diffSearchSource = useSignal(contentSearchDiffSource$);
  useConversationSearchHighlights({
    containerRef: conversationSearchContainerRef,
  });

  const handleEditLastTurnMessage = useCallback(
    async (turn: AppServerConversationTurn, message: string): Promise<void> => {
      try {
        await editLastUserTurn(appServerManager, {
          conversationId,
          turn,
          message,
          agentMode,
        });
      } catch (error) {
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "localConversation.editLastMessageFailed",
            defaultMessage: "Failed to edit message",
            description:
              "Toast shown when editing the previous user message fails",
          }),
        );
        throw error;
      }
    },
    [agentMode, appServerManager, scope, conversationId, intl],
  );

  const forkFromTurn = useCallback(
    async ({
      message,
      turnId,
    }: {
      message: string;
      turnId: string;
    }): Promise<void> => {
      if (!hasConversation) {
        return;
      }

      setIsForkingTurnMessage(true);
      try {
        const newConversationId =
          await appServerManager.forkConversationFromTurn({
            sourceConversationId: conversationId,
            targetTurnId: turnId,
            cwd: conversationCwd,
            workspaceRoots: [conversationCwd ?? "/"],
            collaborationMode: conversationLatestCollaborationMode,
          });
        setPendingOlderTurnFork(null);
        void navigate(buildThreadRouteForCurrentWindow(newConversationId), {
          state: {
            prefillPrompt: message,
            focusComposerNonce: Date.now(),
          },
        });
      } catch (error) {
        logger.error("Error forking conversation from turn", {
          safe: {},
          sensitive: { error },
        });
        scope
          .get(toast$)
          .danger(intl.formatMessage(threadActionMessages.forkThreadError));
        throw error;
      } finally {
        setIsForkingTurnMessage(false);
      }
    },
    [
      appServerManager,
      conversationCwd,
      conversationId,
      conversationLatestCollaborationMode,
      hasConversation,
      intl,
      navigate,
      scope,
    ],
  );

  const handleForkTurnMessage = useCallback(
    (turn: AppServerConversationTurn, message: string): void => {
      if (!canActOnUserMessages || turn.turnId == null) {
        return;
      }
      if (turn.turnId === latestTurnId) {
        void forkFromTurn({
          message,
          turnId: turn.turnId,
        });
        return;
      }
      if (shouldSkipForkFromOlderTurnConfirm()) {
        void forkFromTurn({
          message,
          turnId: turn.turnId,
        });
        return;
      }
      setPendingOlderTurnFork({
        message,
        turnId: turn.turnId,
      });
    },
    [canActOnUserMessages, forkFromTurn, latestTurnId],
  );

  useEffect(() => {
    const previousLatestTurnId = previousLatestTurnIdRef.current;

    if (previousLatestTurnId != null && previousLatestTurnId !== latestTurnId) {
      setCollapsedTurnsByConversationId((current) => {
        return setCollapsedTurnStateByConversation({
          current,
          conversationId,
          turnId: previousLatestTurnId,
          collapsed: true,
        });
      });
    }

    previousLatestTurnIdRef.current = latestTurnId;
  }, [conversationId, latestTurnId, setCollapsedTurnsByConversationId]);

  if (!hasConversation) {
    return <LoadingPage fillParent debugName="LocalConversationThread.state" />;
  }
  if (isSubagentThread && !hasRenderableTurns) {
    return (
      <LoadingPage
        fillParent
        debugName="LocalConversationThread.subagentTurns"
      />
    );
  }
  if (!isSubagentThread && isResuming && !hasRenderableTurns) {
    return (
      <LoadingPage fillParent debugName="LocalConversationThread.resume" />
    );
  }

  return (
    <>
      <ContentSearchControllerBridge
        conversationSource={conversationSearchSource}
        diffSource={diffSearchSource}
      />
      <DeferInitialRender
        key={conversationId}
        defer={shouldDeferThreadContent}
        fallback={
          <div
            ref={conversationSearchContainerRef}
            data-thread-find-target="conversation"
            className="flex flex-col gap-3"
            onMouseDownCapture={() => {
              setContentSearchDefaultDomainForOpen(scope, "conversation");
            }}
            onFocusCapture={() => {
              setContentSearchDefaultDomainForOpen(scope, "conversation");
            }}
          >
            <LoadingPage
              fillParent
              debugName="LocalConversationThread.deferInitialRender"
            />
          </div>
        }
      >
        <div
          ref={conversationSearchContainerRef}
          data-thread-find-target="conversation"
          className="relative flex flex-col gap-3 electron:[--color-token-description-foreground:color-mix(in_srgb,var(--color-token-foreground)_70%,transparent)] browser:[--color-token-description-foreground:color-mix(in_srgb,var(--color-token-foreground)_90%,transparent)]"
          onMouseDownCapture={() => {
            setContentSearchDefaultDomainForOpen(scope, "conversation");
          }}
          onFocusCapture={() => {
            setContentSearchDefaultDomainForOpen(scope, "conversation");
          }}
        >
          {!hasUserMessage && hasAutomationPrompt ? (
            <UserMessage message={automationPrompt ?? ""} />
          ) : null}
          <VirtualizedTurnList
            scrollElement={scrollElement}
            entries={childVisibleTurns.map((visibleTurn) => {
              return {
                turnKey: visibleTurn.turnSearchKey,
              };
            })}
            onApiChange={(api): void => {
              virtualizedTurnListApiRef.current = api;
            }}
            renderTurn={(index): React.ReactElement => {
              const visibleTurn = childVisibleTurns[index];
              if (visibleTurn == null) {
                return <></>;
              }

              const turn = visibleTurn.turn;
              const turnId = visibleTurn.turnId ?? null;
              const turnSearchKey = visibleTurn.turnSearchKey;
              const isMostRecentTurn = index === childVisibleTurns.length - 1;
              const isCollapsed =
                turnId != null ? collapsedTurnsById[turnId] : undefined;

              return (
                <LocalConversationTurn
                  conversationId={conversationId}
                  turnSearchKey={turnSearchKey}
                  requests={visibleTurn.requests}
                  turn={turn}
                  cwd={gitCwd}
                  isMostRecentTurn={isMostRecentTurn}
                  parentThreadAttachment={
                    index === 0 &&
                    inheritedParentTurnIds.size > 0 &&
                    subagentParentThreadId != null
                      ? { sourceConversationId: subagentParentThreadId }
                      : undefined
                  }
                  onEditLastTurnMessage={
                    canActOnUserMessages ? handleEditLastTurnMessage : undefined
                  }
                  onForkTurnMessage={
                    canActOnUserMessages ? handleForkTurnMessage : undefined
                  }
                  isBackgroundSubagentsEnabled={isBackgroundSubagentsEnabled}
                  isCollapsed={isCollapsed}
                  onSetCollapsed={
                    turnId == null
                      ? undefined
                      : (nextCollapsed): void => {
                          if (
                            shouldSuppressAutoStickToBottomOnExpand({
                              persistedCollapsed: isCollapsed,
                              nextCollapsed,
                            })
                          ) {
                            virtualizedTurnListApiRef.current?.setScrollMode(
                              "user",
                            );
                            suppressAutoStickToBottom();
                          }
                          setCollapsedTurnsByConversationId((current) => {
                            return setCollapsedTurnStateByConversation({
                              current,
                              conversationId,
                              turnId,
                              collapsed: nextCollapsed,
                            });
                          });
                        }
                  }
                />
              );
            }}
          />
          <ForkFromOlderTurnDialog
            isSubmitting={isForkingTurnMessage}
            open={pendingOlderTurnFork != null}
            onClose={() => {
              if (isForkingTurnMessage) {
                return;
              }
              setPendingOlderTurnFork(null);
            }}
            onFork={() => {
              if (pendingOlderTurnFork == null) {
                return;
              }
              void forkFromTurn(pendingOlderTurnFork);
            }}
          />
        </div>
      </DeferInitialRender>
    </>
  );
}

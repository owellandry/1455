import { AnimatePresence, motion } from "framer-motion";
import type { ConversationId, GitCwd } from "protocol";
import type React from "react";
import { memo, useEffect, useMemo } from "react";
import { FormattedMessage } from "react-intl";

import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";
import type { ConversationRequest } from "@/app-server/conversation-request";
import { createConversationSearchUnitKey } from "@/content-search/highlight-marks";
import { useWindowType } from "@/hooks/use-window-type";
import { CollapsedTurnSectionToggle } from "@/local-conversation/collapsed-turn-section-toggle";
import { messageBus } from "@/message-bus";
import {
  THREAD_DETAIL_LEVEL_STEPS_PROSE,
  useThreadDetailLevel,
} from "@/settings/thread-detail-level";
import { useGate } from "@/statsig/statsig";
import { ACCORDION_TRANSITION } from "@/utils/animations";
import { logger } from "@/utils/logger";

import { AgentBody } from "./agent-body";
import type { AgentRenderEntry } from "./exploration-accordion";
import { getTurnProgressIndicator } from "./get-turn-progress-indicator";
import { InProgressFixedContentPortal } from "./in-progress-fixed-content-portal";
import { ContextCompactionItemContent } from "./items/context-compaction-item-content";
import { ConversationGap } from "./items/conversation-gap";
import { HookItem } from "./items/hook-item";
import { isItemStillRunning } from "./items/is-item-still-running";
import type { LocalConversationItemOrHook } from "./items/local-conversation-item";
import { renderLocalConversationItemContent } from "./items/local-conversation-item-content";
import {
  mapStateToLocalConversationItems,
  type LocalConversationTurn as LocalConversationTurnState,
} from "./items/map-mcp-conversation-turn";
import { PlanSummaryItemContent } from "./items/plan-summary-item-content";
import { ThinkingShimmer } from "./items/thinking-shimmer";
import { TimelineItem } from "./items/timeline-item";
import { TurnDiffContent } from "./items/turn-diff-content";
import { segmentAgentItemsWithState } from "./segment-agent-items";
import { splitItemsIntoRenderGroups } from "./split-items-into-render-groups";
import { getAgentBodyCollapseState } from "./turn-collapse";

const LOCAL_ITEM_GAP_SIZE = "var(--conversation-tool-assistant-gap, 8px)";

export const LocalConversationTurn = memo(function LocalConversationTurn({
  conversationId,
  turnSearchKey,
  turn: mcpTurn,
  requests,
  conversationDetailLevel,
  cwd,
  isMostRecentTurn = false,
  isCollapsed,
  onSetCollapsed,
  emptyUserMessageOverride,
  parentThreadAttachment,
  onEditLastTurnMessage,
  onForkTurnMessage,
  isBackgroundSubagentsEnabled = true,
}: {
  conversationId: ConversationId;
  turnSearchKey: string;
  requests: Array<ConversationRequest>;
  turn: AppServerConversationTurn;
  conversationDetailLevel?: ReturnType<typeof useThreadDetailLevel>;
  cwd: GitCwd | null;
  isMostRecentTurn?: boolean;
  isCollapsed?: boolean;
  onSetCollapsed?: (nextCollapsed: boolean) => void;
  emptyUserMessageOverride?: string | null;
  parentThreadAttachment?: { sourceConversationId: string };
  onEditLastTurnMessage?: (
    turn: AppServerConversationTurn,
    message: string,
  ) => Promise<void>;
  onForkTurnMessage?: (
    turn: AppServerConversationTurn,
    message: string,
  ) => void;
  isBackgroundSubagentsEnabled?: boolean;
}): React.ReactElement {
  const heartbeatAutomationsEnabled = useGate(
    __statsigName("codex-app-automation-heartbeat"),
  );
  const turn = useMemo(
    () =>
      mapStateToLocalConversationItems(mcpTurn, requests, {
        isBackgroundSubagentsEnabled,
        enableHeartbeatAutomationRendering: heartbeatAutomationsEnabled,
      }),
    [
      heartbeatAutomationsEnabled,
      isBackgroundSubagentsEnabled,
      mcpTurn,
      requests,
    ],
  );
  return (
    <LocalConversationTurnContent
      conversationId={conversationId}
      turnSearchKey={turnSearchKey}
      turn={turn}
      conversationDetailLevel={conversationDetailLevel}
      cwd={cwd}
      isMostRecentTurn={isMostRecentTurn}
      isCollapsed={isCollapsed}
      onSetCollapsed={onSetCollapsed}
      emptyUserMessageOverride={emptyUserMessageOverride}
      parentThreadAttachment={parentThreadAttachment}
      onEditUserMessage={
        !isMostRecentTurn ||
        mcpTurn.turnId == null ||
        mcpTurn.status === "inProgress"
          ? undefined
          : async (message): Promise<void> => {
              await onEditLastTurnMessage?.(mcpTurn, message);
            }
      }
      onForkUserMessage={
        mcpTurn.turnId == null || mcpTurn.status === "inProgress"
          ? undefined
          : (message): void => {
              onForkTurnMessage?.(mcpTurn, message);
            }
      }
    />
  );
}, areLocalConversationTurnPropsEqual);

function areLocalConversationTurnPropsEqual(
  previous: {
    conversationId: ConversationId;
    turnSearchKey: string;
    requests: Array<ConversationRequest>;
    turn: AppServerConversationTurn;
    conversationDetailLevel?: ReturnType<typeof useThreadDetailLevel>;
    cwd: GitCwd | null;
    isMostRecentTurn?: boolean;
    isCollapsed?: boolean;
    onSetCollapsed?: (nextCollapsed: boolean) => void;
    emptyUserMessageOverride?: string | null;
    parentThreadAttachment?: { sourceConversationId: string };
    onEditLastTurnMessage?: (
      turn: AppServerConversationTurn,
      message: string,
    ) => Promise<void>;
    onForkTurnMessage?: (
      turn: AppServerConversationTurn,
      message: string,
    ) => void;
    isBackgroundSubagentsEnabled?: boolean;
  },
  next: {
    conversationId: ConversationId;
    turnSearchKey: string;
    requests: Array<ConversationRequest>;
    turn: AppServerConversationTurn;
    conversationDetailLevel?: ReturnType<typeof useThreadDetailLevel>;
    cwd: GitCwd | null;
    isMostRecentTurn?: boolean;
    isCollapsed?: boolean;
    onSetCollapsed?: (nextCollapsed: boolean) => void;
    emptyUserMessageOverride?: string | null;
    parentThreadAttachment?: { sourceConversationId: string };
    onEditLastTurnMessage?: (
      turn: AppServerConversationTurn,
      message: string,
    ) => Promise<void>;
    onForkTurnMessage?: (
      turn: AppServerConversationTurn,
      message: string,
    ) => void;
    isBackgroundSubagentsEnabled?: boolean;
  },
): boolean {
  return (
    previous.conversationId === next.conversationId &&
    previous.turnSearchKey === next.turnSearchKey &&
    previous.turn === next.turn &&
    previous.requests === next.requests &&
    previous.conversationDetailLevel === next.conversationDetailLevel &&
    previous.cwd === next.cwd &&
    previous.isMostRecentTurn === next.isMostRecentTurn &&
    previous.isCollapsed === next.isCollapsed &&
    previous.emptyUserMessageOverride === next.emptyUserMessageOverride &&
    previous.parentThreadAttachment?.sourceConversationId ===
      next.parentThreadAttachment?.sourceConversationId &&
    previous.onEditLastTurnMessage === next.onEditLastTurnMessage &&
    previous.onForkTurnMessage === next.onForkTurnMessage &&
    previous.isBackgroundSubagentsEnabled === next.isBackgroundSubagentsEnabled
  );
}

export function LocalConversationTurnContent({
  conversationId,
  turnSearchKey = "turn",
  turn,
  conversationDetailLevel,
  cwd,
  isMostRecentTurn = false,
  isCollapsed,
  onSetCollapsed,
  emptyUserMessageOverride,
  parentThreadAttachment,
  onEditUserMessage,
  onForkUserMessage,
}: {
  conversationId: ConversationId;
  turnSearchKey?: string;
  turn: LocalConversationTurnState;
  conversationDetailLevel?: ReturnType<typeof useThreadDetailLevel>;
  cwd: GitCwd | null;
  isMostRecentTurn?: boolean;
  isCollapsed?: boolean;
  onSetCollapsed?: (nextCollapsed: boolean) => void;
  emptyUserMessageOverride?: string | null;
  parentThreadAttachment?: { sourceConversationId: string };
  onEditUserMessage?: (message: string) => Promise<void>;
  onForkUserMessage?: (message: string) => void;
}): React.ReactNode {
  const isTurnInProgress = turn.status === "in_progress";
  const isTurnCancelled = turn.status === "cancelled";
  const defaultThreadDetailLevel = useThreadDetailLevel();
  const threadDetailLevel = conversationDetailLevel ?? defaultThreadDetailLevel;
  const windowType = useWindowType();
  const {
    preUserItems,
    userItems,
    assistantItem,
    systemEventItem,
    agentItems,
    unifiedDiffItem,
    todoListItem,
    proposedPlanItem,
    approvalItem,
    userInputItem,
    mcpServerElicitationItems,
    postAssistantItems,
    remoteTaskCreatedItems,
    personalityChangedItems,
    forkedFromConversationItems,
    modelChangedItems,
    modelReroutedItems,
  } = splitItemsIntoRenderGroups(turn.items, turn.status);
  const searchableUnitIdsByItem = new Map<
    LocalConversationItemOrHook,
    string
  >();
  turn.items.forEach((item, index) => {
    if (item.type === "user-message") {
      searchableUnitIdsByItem.set(item, `${index}:user`);
      return;
    }
    if (item.type === "assistant-message") {
      searchableUnitIdsByItem.set(item, `${index}:assistant`);
    }
  });
  const unifiedDiff = unifiedDiffItem?.unifiedDiff ?? null;
  const hasBlockingRequest =
    approvalItem != null ||
    userInputItem != null ||
    mcpServerElicitationItems.some((item) => !item.completed);
  const hideCodeBlocks = threadDetailLevel === THREAD_DETAIL_LEVEL_STEPS_PROSE;
  const hasWorkedForItem = agentItems.some(
    (item) => item.type === "worked-for",
  );
  // Sync diff state in main panel
  useEffect(() => {
    if (unifiedDiff) {
      try {
        messageBus.dispatchMessage("update-diff-if-open", {
          unifiedDiff,
          conversationId,
        });
      } catch {
        logger.error("Unable to base64 encode unified diff");
      }
    }
  }, [conversationId, unifiedDiff]);

  const isAnyNonAgentItemInProgress =
    isItemStillRunning(assistantItem) || isItemStillRunning(proposedPlanItem);

  const assistantCopyText =
    !isTurnInProgress && assistantItem ? assistantItem.content.trim() : null;
  const hasAssistantStartedStreaming =
    assistantItem != null &&
    !assistantItem.completed &&
    assistantItem.content.trim().length > 0;

  const {
    renderableAgentItems,
    isAnyNonExploringAgentItemInProgress,
    isExploring,
  } = segmentAgentItemsWithState({
    agentItems,
    isTurnInProgress,
    isAnyNonAgentItemInProgress,
  });
  const progressIndicator = getTurnProgressIndicator({
    isTurnInProgress,
    assistantItem,
    proposedPlanItem,
    isExploring,
    isAnyNonExploringAgentItemInProgress,
    hasWorkedForItem,
    hasBlockingRequest,
  });

  const {
    shouldAllowCollapse: shouldAllowAgentBodyCollapseByTurnState,
    isCollapsed: isAgentBodyCollapsedByTurnState,
  } = getAgentBodyCollapseState({
    isTurnInProgress,
    isTurnCancelled,
    isMostRecentTurn,
    hasRenderableAgentItems: renderableAgentItems.length > 0,
    persistedCollapsed: isCollapsed,
  });
  const visibleAgentItems = shouldAllowAgentBodyCollapseByTurnState
    ? removeWorkedForItems(renderableAgentItems)
    : renderableAgentItems;
  const workedForTimeLabel = shouldAllowAgentBodyCollapseByTurnState
    ? getWorkedForTimeLabel(renderableAgentItems)
    : null;
  const shouldRenderAgentBody = visibleAgentItems.length > 0;
  const shouldAllowAgentBodyCollapse =
    shouldAllowAgentBodyCollapseByTurnState && shouldRenderAgentBody;
  const isAgentBodyCollapsed = shouldAllowAgentBodyCollapse
    ? isAgentBodyCollapsedByTurnState
    : false;
  const collapsedEntryCount = visibleAgentItems.length;
  const shouldShowAgentBodyCollapseToggle =
    shouldAllowAgentBodyCollapse && collapsedEntryCount > 0;

  const blocks = Array<{ key: string; node: React.ReactNode }>();
  const pushBlock = (key: string, node: React.ReactNode): void => {
    if (node == null) {
      return;
    }
    blocks.push({ key, node });
  };
  const wrapSearchableContent = ({
    item,
    content,
  }: {
    item: LocalConversationItemOrHook;
    content: React.ReactNode;
  }): React.ReactNode => {
    if (content == null) {
      return null;
    }
    const unitId = searchableUnitIdsByItem.get(item);
    if (unitId == null) {
      return content;
    }
    return (
      <div
        data-content-search-unit-key={createConversationSearchUnitKey(
          turnSearchKey,
          unitId,
        )}
      >
        {content}
      </div>
    );
  };
  for (const item of modelChangedItems) {
    pushBlock(
      `model-changed-${item.id}`,
      renderLocalConversationItemContent({
        item,
        conversationId,
        conversationDetailLevel: threadDetailLevel,
        isTurnInProgress,
        cwd,
      }),
    );
  }

  for (const item of preUserItems) {
    pushBlock(`pre-user-${item.id}`, <HookItem item={item} />);
  }

  for (const [index, userItem] of userItems.entries()) {
    pushBlock(
      `user-item-${String(index)}`,
      wrapSearchableContent({
        item: userItem,
        content: renderLocalConversationItemContent({
          item: userItem,
          conversationId,
          conversationDetailLevel: threadDetailLevel,
          isTurnInProgress,
          cwd,
          parentThreadAttachment:
            index === 0 ? parentThreadAttachment : undefined,
          onEditMessage:
            index === userItems.length - 1 ? onEditUserMessage : undefined,
          onForkMessage: onForkUserMessage,
          emptyUserMessageOverride:
            index === 0 ? emptyUserMessageOverride : undefined,
        }),
      }),
    );
  }
  for (const item of modelReroutedItems) {
    if (item.reason !== "highRiskCyberActivity") {
      continue;
    }
    pushBlock(
      `model-rerouted-${item.id}`,
      renderLocalConversationItemContent({
        item,
        conversationId,
        conversationDetailLevel: threadDetailLevel,
        isTurnInProgress,
        cwd,
      }),
    );
  }

  if (shouldRenderAgentBody) {
    pushBlock(
      "agent-body-collapsible",
      <CollapsibleAgentBodySection
        collapsedMessageCount={collapsedEntryCount}
        workedForTimeLabel={workedForTimeLabel}
        isCollapsed={shouldShowAgentBodyCollapseToggle && isAgentBodyCollapsed}
        showToggle={shouldShowAgentBodyCollapseToggle}
        onToggle={() => {
          if (!onSetCollapsed || !shouldShowAgentBodyCollapseToggle) {
            return;
          }
          onSetCollapsed(!isAgentBodyCollapsed);
        }}
        content={
          <AgentBody
            entries={visibleAgentItems}
            conversationId={conversationId}
            conversationDetailLevel={threadDetailLevel}
            isTurnInProgress={isTurnInProgress}
            hasAssistantStartedStreaming={hasAssistantStartedStreaming}
            cwd={cwd}
          />
        }
      />,
    );
  }

  if (systemEventItem) {
    pushBlock(
      "system-event",
      renderLocalConversationItemContent({
        item: systemEventItem,
        conversationId,
        conversationDetailLevel: threadDetailLevel,
        isTurnInProgress,
        cwd,
      }),
    );
  }

  if (assistantItem) {
    if (shouldShowAgentBodyCollapseToggle && !isAgentBodyCollapsed) {
      pushBlock(
        "final-assistant-divider",
        <ContextCompactionItemContent
          completed
          showCompletedIcon={false}
          completedLabel={
            <FormattedMessage
              id="localConversation.finalAssistantMessageDivider"
              defaultMessage="Final message"
              description="Divider label shown before the final assistant response when the worked-for section is expanded"
            />
          }
        />,
      );
    }
    pushBlock(
      "assistant-item",
      wrapSearchableContent({
        item: assistantItem,
        content: renderLocalConversationItemContent({
          item: assistantItem,
          conversationId,
          conversationDetailLevel: threadDetailLevel,
          isTurnInProgress,
          cwd,
          assistantCopyText: assistantCopyText ?? undefined,
        }),
      }),
    );
  }

  for (const item of postAssistantItems) {
    pushBlock(
      `post-assistant-${item.id}`,
      item.type === "hook" ? (
        <HookItem item={item} />
      ) : (
        renderLocalConversationItemContent({
          item,
          conversationId,
          conversationDetailLevel: threadDetailLevel,
          isTurnInProgress,
          cwd,
        })
      ),
    );
  }

  for (const item of mcpServerElicitationItems) {
    pushBlock(
      `mcp-server-elicitation-${item.requestId}`,
      renderLocalConversationItemContent({
        item,
        conversationId,
        conversationDetailLevel: threadDetailLevel,
        isTurnInProgress,
        cwd,
      }),
    );
  }

  if (proposedPlanItem) {
    const shouldCollapsePlanSummary =
      windowType === "extension" || !proposedPlanItem.completed;
    pushBlock(
      "proposed-plan",
      <PlanSummaryItemContent
        item={proposedPlanItem}
        conversationId={conversationId}
        cwd={cwd}
        hideCodeBlocks={hideCodeBlocks}
        defaultCollapsed={shouldCollapsePlanSummary}
      />,
    );
  }

  // Anything that is not covered by this either does not get rendered in thread or do not
  // have a loading like state (i.e. shimmer) therefore we show `thinking`
  if (progressIndicator.type === "thinking") {
    pushBlock(
      "thinking-placeholder",
      <ThinkingPlaceholder isVisible={progressIndicator.isVisible} />,
    );
  }

  if (
    !isTurnInProgress &&
    unifiedDiffItem &&
    threadDetailLevel !== THREAD_DETAIL_LEVEL_STEPS_PROSE
  ) {
    pushBlock(
      "turn-diff",
      <TurnDiffContent
        isInProgress={false}
        item={unifiedDiffItem}
        conversationId={conversationId}
        cwd={cwd}
      />,
    );
  }

  for (const item of remoteTaskCreatedItems) {
    pushBlock(
      `remote-task-${item.taskId}`,
      renderLocalConversationItemContent({
        item,
        conversationId,
        conversationDetailLevel: threadDetailLevel,
        isTurnInProgress,
        cwd,
      }),
    );
  }
  for (const item of personalityChangedItems) {
    pushBlock(
      `personality-changed-${item.id}`,
      renderLocalConversationItemContent({
        item,
        conversationId,
        conversationDetailLevel: threadDetailLevel,
        isTurnInProgress,
        cwd,
      }),
    );
  }
  for (const item of forkedFromConversationItems) {
    pushBlock(
      `forked-from-conversation-${item.id}`,
      renderLocalConversationItemContent({
        item,
        conversationId,
        conversationDetailLevel: threadDetailLevel,
        isTurnInProgress,
        cwd,
      }),
    );
  }

  if (isTurnInProgress) {
    pushBlock(
      "in-progress-fixed-content",
      <InProgressFixedContentPortal
        conversationId={conversationId}
        hasBlockingRequest={hasBlockingRequest}
        todoListItem={todoListItem}
        unifiedDiffItem={unifiedDiffItem}
        conversationDetailLevel={threadDetailLevel}
        cwd={cwd}
      />,
    );
  }

  if (blocks.length <= 1) {
    const singleBlock = blocks[0];
    if (!singleBlock) {
      return null;
    }
    return (
      <div className="flex flex-col gap-0 [contain-intrinsic-size:auto_240px] [content-visibility:auto]">
        {singleBlock.node}
      </div>
    );
  }

  const renderBlocks: Array<React.ReactElement> = [];

  blocks.forEach((block, index) => {
    if (index > 0) {
      const prev = blocks[index - 1];
      renderBlocks.push(
        <ConversationGap
          key={`block-gap-${prev.key}-${block.key}`}
          size={LOCAL_ITEM_GAP_SIZE}
        />,
      );
    }
    renderBlocks.push(
      <div key={block.key} className="flex flex-col">
        {block.node}
      </div>,
    );
  });

  return <div className="flex flex-col gap-0">{renderBlocks}</div>;
}

function ThinkingPlaceholder({
  isVisible = true,
}: {
  isVisible?: boolean;
}): React.ReactElement {
  return (
    <TimelineItem>
      <span aria-hidden={!isVisible}>
        <ThinkingShimmer className={isVisible ? undefined : "invisible"} />
      </span>
    </TimelineItem>
  );
}

function CollapsibleAgentBodySection({
  collapsedMessageCount,
  workedForTimeLabel,
  isCollapsed,
  showToggle,
  onToggle,
  content,
}: {
  collapsedMessageCount: number;
  workedForTimeLabel: string | null;
  isCollapsed: boolean;
  showToggle: boolean;
  onToggle: () => void;
  content: React.ReactElement;
}): React.ReactElement {
  return (
    <>
      {showToggle ? (
        <CollapsedTurnSectionToggle
          collapsedMessageCount={collapsedMessageCount}
          workedForTimeLabel={workedForTimeLabel}
          isCollapsed={isCollapsed}
          onToggle={onToggle}
        />
      ) : null}
      <AnimatePresence initial={false}>
        {!isCollapsed ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={ACCORDION_TRANSITION}
            style={{ overflow: "hidden" }}
          >
            {showToggle ? (
              <ConversationGap
                key="agent-body-toggle-gap"
                size={LOCAL_ITEM_GAP_SIZE}
              />
            ) : null}
            {content}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function removeWorkedForItems(
  entries: Array<AgentRenderEntry>,
): Array<AgentRenderEntry> {
  return entries.filter((entry) => {
    return entry.kind !== "item" || entry.item.type !== "worked-for";
  });
}

function getWorkedForTimeLabel(
  entries: Array<AgentRenderEntry>,
): string | null {
  for (const entry of entries) {
    if (entry.kind === "item" && entry.item.type === "worked-for") {
      return entry.item.timeLabel;
    }
  }
  return null;
}

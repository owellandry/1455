import type { ConversationId } from "protocol";

export function getAgentBodyCollapseState({
  isTurnInProgress,
  isTurnCancelled,
  isMostRecentTurn: _isMostRecentTurn,
  hasRenderableAgentItems,
  persistedCollapsed,
}: {
  isTurnInProgress: boolean;
  isTurnCancelled: boolean;
  isMostRecentTurn: boolean;
  hasRenderableAgentItems: boolean;
  persistedCollapsed: boolean | undefined;
}): {
  shouldAllowCollapse: boolean;
  isCollapsed: boolean;
} {
  const shouldAllowCollapse =
    !isTurnInProgress && !isTurnCancelled && hasRenderableAgentItems;
  if (!shouldAllowCollapse) {
    return {
      shouldAllowCollapse: false,
      isCollapsed: false,
    };
  }
  return {
    shouldAllowCollapse: true,
    isCollapsed: persistedCollapsed ?? true,
  };
}

export function shouldSuppressAutoStickToBottomOnExpand({
  persistedCollapsed,
  nextCollapsed,
}: {
  persistedCollapsed: boolean | undefined;
  nextCollapsed: boolean;
}): boolean {
  return persistedCollapsed !== false && !nextCollapsed;
}

export function setCollapsedTurnStateByConversation({
  current,
  conversationId,
  turnId,
  collapsed,
}: {
  current: Record<ConversationId, Record<string, boolean>>;
  conversationId: ConversationId;
  turnId: string;
  collapsed: boolean;
}): Record<ConversationId, Record<string, boolean>> {
  const existingConversationMap = current[conversationId] ?? {};
  return {
    ...current,
    [conversationId]: {
      ...existingConversationMap,
      [turnId]: collapsed,
    },
  };
}
